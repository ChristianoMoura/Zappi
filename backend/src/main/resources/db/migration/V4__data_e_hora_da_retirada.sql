-- Zappi: a retirada do pedido passa a ter data e hora (ZAP-127).
-- Mudança no dicionário de dados da Atividade #14 (registro na ZAP-83 e na seção 17 do
-- context.md): `data_retirada` deixa de ser DATE e vira TIMESTAMP, sem fuso, no horário de
-- São Paulo, onde a Lídia entrega os pedidos. Os pedidos que já existem ficam com 12:00, um
-- horário neutro que a Lídia pode corrigir editando o pedido.

ALTER TABLE pedido
    ALTER COLUMN data_retirada TYPE TIMESTAMP USING data_retirada + TIME '12:00';

-- RN23: retirada das 8h às 20h, em hora cheia ou meia hora (sem segundos).
ALTER TABLE pedido
    ADD CONSTRAINT ck_pedido_horario_retirada CHECK (
        data_retirada::time BETWEEN TIME '08:00' AND TIME '20:00'
        AND date_trunc('minute', data_retirada) = data_retirada
        AND EXTRACT(MINUTE FROM data_retirada) IN (0, 30)
    );
