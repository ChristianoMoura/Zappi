-- Zappi: status 6-Entregue do pedido (ZAP-60, ZAP-167).
-- Mudança no dicionário de dados da Atividade #14 (registro na ZAP-83 e na seção 17 do
-- context.md): o pedido Concluído passa a ter mais um passo, quando o cliente retira.
--
-- O Entregue fica com o número 6, e o Recusado continua 5: nenhum pedido que já existe muda de
-- número (RN03). A coluna nova `entregue_em` guarda a data e a hora em que a Lídia marcou o
-- pedido como entregue (RN06), e só existe no status 6: voltar para Concluído apaga a data.
--
-- Nada se perde: os pedidos que já existem não têm o status 6 nem a data, então continuam como
-- estão, e os concluídos continuam em Concluído.

-- 1-Novo, 2-Confirmado, 3-Em produção, 4-Concluído, 5-Recusado, 6-Entregue (RN03).
ALTER TABLE pedido DROP CONSTRAINT ck_pedido_status;
ALTER TABLE pedido ADD CONSTRAINT ck_pedido_status CHECK (status BETWEEN 1 AND 6);

ALTER TABLE pedido ADD COLUMN entregue_em TIMESTAMPTZ;

-- A data de entrega existe só no Entregue, e todo Entregue tem a data (RN06).
ALTER TABLE pedido
    ADD CONSTRAINT ck_pedido_entregue_em CHECK ((status = 6) = (entregue_em IS NOT NULL));
