-- Zappi: alérgenos do produto como lista fixa de códigos (ZAP-128, ZAP-197).
-- Coluna nova, fora do dicionário de dados da Atividade #14 (registro na ZAP-83 e na
-- seção 17 do context.md).
--
-- A tela (ZAP-132) marca os alérgenos de uma lista fixa, com o glúten junto, e a API passa a
-- receber e devolver essa lista em `alergenos`. Lista vazia é "nenhum alérgeno da lista";
-- os que não estão nela continuam no texto livre `outros_alergenos` (V5).
--
-- O `contem_gluten` da V5 deixa de existir: o glúten é o código GLUTEN da lista. Os produtos
-- marcados com glúten passam a ter GLUTEN antes de a coluna sair.

ALTER TABLE produto
    ADD COLUMN alergenos VARCHAR(20)[] NOT NULL DEFAULT '{}';

-- Só os códigos da lista, sem posição vazia (um nulo dentro da lista também é recusado)
ALTER TABLE produto
    ADD CONSTRAINT ck_produto_alergenos
        CHECK (alergenos <@ ARRAY['GLUTEN', 'LEITE', 'OVOS', 'SOJA', 'AMENDOIM', 'CASTANHAS', 'GERGELIM']::VARCHAR(20)[]);

UPDATE produto SET alergenos = ARRAY['GLUTEN']::VARCHAR(20)[] WHERE contem_gluten;

ALTER TABLE produto
    DROP COLUMN contem_gluten;
