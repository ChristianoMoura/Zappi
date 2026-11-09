-- Zappi: logo e foto de capa do estabelecimento (ZAP-119).
-- Colunas novas, fora do dicionário de dados da Atividade #14 (registro na ZAP-83 e na
-- seção 17 do context.md). Como na foto do produto (ZAP-40), o banco guarda só o caminho
-- dentro do bucket `estabelecimentos` do Supabase Storage. O texto alternativo do logo vem
-- do nome da loja ("Logo de Casa Belt"), e a capa é decorativa: nenhuma das duas precisa de
-- coluna de texto alternativo.

ALTER TABLE estabelecimento
    ADD COLUMN logo_caminho VARCHAR(255),
    ADD COLUMN capa_caminho VARCHAR(255);
