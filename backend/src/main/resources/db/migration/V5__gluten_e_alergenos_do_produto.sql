-- Zappi: glúten e outros alérgenos nos produtos (ZAP-128, ZAP-130).
-- Colunas novas, fora do dicionário de dados da Atividade #14 (registro na ZAP-83 e na
-- seção 17 do context.md).
--
-- `contem_gluten` aceita nulo de propósito: nulo é "não informado". Os produtos que já
-- existem ficam com nulo, porque o sistema nunca pode mostrar "Não contém glúten" sem a
-- Lídia ter informado. Por isso a coluna não tem padrão nem é NOT NULL. A obrigatoriedade
-- no cadastro e na edição é validada pela API (ZAP-131).
-- `outros_alergenos` é texto livre e opcional (ex.: "leite, ovos, castanhas").

ALTER TABLE produto
    ADD COLUMN contem_gluten    BOOLEAN,
    ADD COLUMN outros_alergenos VARCHAR(300);
