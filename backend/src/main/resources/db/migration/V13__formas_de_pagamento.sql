-- Zappi: formas de pagamento aceitas pela loja e escolhidas no pedido (ZAP-190, ZAP-191).
-- Colunas novas, fora do dicionário de dados da Atividade #14 (registro na ZAP-83 e na
-- seção 17 do context.md).
--
-- Lista fixa de códigos, na ordem da tela: DINHEIRO, PIX, CREDITO, DEBITO e VR. O pagamento
-- continua sendo na retirada (RN19): o sistema só guarda a forma combinada.
--
-- Formas aceitas pela loja: lista do PostgreSQL, no mesmo formato de `produto.alergenos`
-- (V12). Pelo menos uma, e só os códigos da lista. As lojas que já existem ficam com todas
-- (decisão de 15/11/2026), para nada mudar no cardápio até a Lídia escolher.
--
-- Forma do pedido: opcional no banco, porque os pedidos que já existem ficam sem forma
-- ("Não informada"). A API exige a forma nos pedidos novos (ZAP-192). Como o preço (RN10),
-- ela fica gravada no pedido: se a loja deixar de aceitar uma forma, os pedidos não mudam.
--
-- Nada se perde: só acrescenta.

ALTER TABLE estabelecimento
    ADD COLUMN formas_pagamento VARCHAR(10)[] NOT NULL
        DEFAULT '{DINHEIRO,PIX,CREDITO,DEBITO,VR}',
    ADD CONSTRAINT ck_estabelecimento_formas_pagamento
        CHECK (cardinality(formas_pagamento) > 0
            AND formas_pagamento <@ ARRAY['DINHEIRO', 'PIX', 'CREDITO', 'DEBITO', 'VR']::VARCHAR(10)[]);

ALTER TABLE pedido
    ADD COLUMN forma_pagamento VARCHAR(10),
    ADD CONSTRAINT ck_pedido_forma_pagamento
        CHECK (forma_pagamento IS NULL OR forma_pagamento IN ('DINHEIRO', 'PIX', 'CREDITO', 'DEBITO', 'VR'));
