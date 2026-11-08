-- Zappi: dados iniciais e de demonstração (ZAP-73, seção 5.3 do context.md).
-- Os clientes são fictícios, nunca dados reais. As unidades de medida já vêm da V1.
--
-- O hash BCrypt da senha da Lídia não fica no repositório: vem da variável de ambiente
-- LIDIA_SENHA_HASH, pelo placeholder do Flyway (README, "Migrações do banco"). A senha
-- em texto não é registrada em lugar nenhum (ISO 27002 8.24).

DO $$
DECLARE
    lidia_senha_hash CONSTANT TEXT := '${lidia_senha_hash}';
    casa_belt    BIGINT;
    ana          BIGINT;
    bruno        BIGINT;
    pedido_ana   BIGINT;
    pedido_bruno BIGINT;
BEGIN
    IF lidia_senha_hash !~ '^[$]2[aby][$]12[$].{53}$' THEN
        RAISE EXCEPTION 'Defina LIDIA_SENHA_HASH com o hash BCrypt (custo 12) da senha da Lídia.';
    END IF;

    INSERT INTO estabelecimento (nome, slug, descricao, telefone_whatsapp)
    VALUES ('Casa Belt', 'casa-belt', 'Confeitaria artesanal: bolos e salgados sob encomenda.', '5511900000000')
    RETURNING id INTO casa_belt;

    INSERT INTO usuario (estabelecimento_id, nome, email, senha_hash)
    VALUES (casa_belt, 'Lídia', 'lidia@casabelt.com', lidia_senha_hash);

    -- Cardápio de exemplo: preços dos bolos da seção 2.2 e salgados por unidade (ZAP-64).
    INSERT INTO produto (estabelecimento_id, unidade_medida_id, nome, sabor, descricao, preco)
    VALUES
        (casa_belt, 1, 'Bolo', 'Brigadeiro de chocolate', 'Massa de chocolate, recheio de brigadeiro e cobertura de granulado.', 100.00),
        (casa_belt, 1, 'Bolo', 'Ninho com morango', 'Recheio de leite Ninho com morango.', 115.00),
        (casa_belt, 2, 'Salgado', 'Cento de coxinha', 'Cem coxinhas de frango.', 120.00),
        (casa_belt, 2, 'Salgado', 'Coxinha por unidade', 'Coxinha de frango, vendida por unidade.', 1.25);

    -- Clientes fictícios, com consentimento LGPD registrado (RN16).
    INSERT INTO cliente (estabelecimento_id, nome, telefone_whatsapp, consentimento_lgpd, consentimento_em)
    VALUES (casa_belt, 'Ana Exemplo', '5511900000001', TRUE, now())
    RETURNING id INTO ana;

    INSERT INTO cliente (estabelecimento_id, nome, telefone_whatsapp, consentimento_lgpd, consentimento_em)
    VALUES (casa_belt, 'Bruno Exemplo', '5511900000002', TRUE, now())
    RETURNING id INTO bruno;

    -- Dois pedidos Novos para a demonstração e o treinamento: um para confirmar e outro
    -- para recusar com motivo. O total é a soma dos subtotais (RN11).
    INSERT INTO pedido (estabelecimento_id, cliente_id, numero, status, data_retirada, observacao, valor_total)
    VALUES (casa_belt, ana, 1, 1, current_date + 3, 'Aniversário de 7 anos, tema unicórnio.', 200.00)
    RETURNING id INTO pedido_ana;

    INSERT INTO pedido (estabelecimento_id, cliente_id, numero, status, data_retirada, observacao, valor_total)
    VALUES (casa_belt, bruno, 2, 1, current_date + 5, 'Confraternização do trabalho.', 292.50)
    RETURNING id INTO pedido_bruno;

    -- Itens com o preço congelado do cardápio (RN10).
    INSERT INTO item_pedido (pedido_id, produto_id, quantidade, preco_unitario, subtotal, recheio, cobertura)
    SELECT pedido_ana, p.id, 2.000, p.preco, 2.000 * p.preco, 'Brigadeiro', 'Granulado'
    FROM produto p
    WHERE p.estabelecimento_id = casa_belt AND p.sabor = 'Brigadeiro de chocolate';

    INSERT INTO item_pedido (pedido_id, produto_id, quantidade, preco_unitario, subtotal)
    SELECT pedido_bruno, p.id, i.quantidade, p.preco, i.quantidade * p.preco
    FROM (VALUES ('Cento de coxinha', 1.000), ('Ninho com morango', 1.500)) AS i (sabor, quantidade)
    JOIN produto p ON p.estabelecimento_id = casa_belt AND p.sabor = i.sabor;
END
$$;
