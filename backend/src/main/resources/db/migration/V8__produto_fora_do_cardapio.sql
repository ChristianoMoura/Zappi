-- Zappi: produto fora do cardápio por um tempo, sem excluir (ZAP-151, ZAP-153).
-- Coluna nova, fora do dicionário de dados da Atividade #14 (registro na ZAP-83 e, na
-- documentação, na ZAP-158): `produto.no_cardapio`.
--
-- É um estado separado da exclusão lógica (`ativo`, RN14):
--   - ativo = TRUE  e no_cardapio = TRUE  → aparece no cardápio público e entra em pedido novo;
--   - ativo = TRUE  e no_cardapio = FALSE → fora do cardápio: só na tela de produtos do painel;
--   - ativo = FALSE                       → excluído: some de todos os lugares.
-- Os pedidos que já têm o produto não mudam: o item guarda o preço congelado (RN10).
--
-- Nada se perde: só acrescenta. Os produtos que já existem, ativos ou excluídos, ficam com TRUE,
-- e o produto novo também entra no cardápio por padrão.

ALTER TABLE produto
    ADD COLUMN no_cardapio BOOLEAN NOT NULL DEFAULT TRUE;
