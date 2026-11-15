-- Zappi: preço promocional nos produtos (ZAP-152, ZAP-159).
-- Colunas novas, fora do dicionário de dados da Atividade #14 (registro na ZAP-83 e, na
-- documentação, na ZAP-164): `produto.preco_promocional` e `estabelecimento.destacar_promocoes`.
--
-- Preço promocional:
--   - nulo  → sem promoção: o produto é cobrado pelo preço normal (`preco`);
--   - valor → promoção ativa: o pedido novo usa este preço, e o cardápio mostra o normal riscado.
-- Precisa ser maior que zero e menor que o preço normal (CDC: o preço anterior é o real).
-- Não há data de fim: a Lídia aplica e encerra a promoção na tela do produto.
-- Os pedidos que já existem não mudam: o item guarda o preço congelado (RN10).
--
-- Destaque das promoções: opção da Lídia, na tela Estabelecimento, de mostrar a seção
-- "Promoções" no topo do cardápio público. Ligada por padrão.
--
-- Nada se perde: só acrescenta. Os produtos que já existem ficam sem promoção, e as lojas que
-- já existem ficam com o destaque ligado.

ALTER TABLE produto
    ADD COLUMN preco_promocional NUMERIC(10,2),
    ADD CONSTRAINT ck_produto_preco_promocional
        CHECK (preco_promocional IS NULL OR (preco_promocional > 0 AND preco_promocional < preco));

ALTER TABLE estabelecimento
    ADD COLUMN destacar_promocoes BOOLEAN NOT NULL DEFAULT TRUE;
