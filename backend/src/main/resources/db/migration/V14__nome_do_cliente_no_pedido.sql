-- Zappi: nome do cliente guardado em cada pedido (ZAP-199, ZAP-200).
-- Mudança no dicionário de dados da Atividade #14 (registro na ZAP-83 e na seção 17 do
-- context.md): o cliente continua único pelo WhatsApp no estabelecimento (RN18), mas o mesmo
-- número pode fazer pedidos com nomes diferentes, e cada pedido passa a guardar o nome informado
-- nele. `cliente.nome` continua existindo.
--
-- Nada muda na tela: os pedidos que já existem recebem o nome atual do cliente. Os clientes já
-- anonimizados têm "Cliente anonimizado" em `cliente.nome` (RN17), então os pedidos deles ficam
-- com esse texto, sem o nome antigo.

ALTER TABLE pedido ADD COLUMN nome_cliente VARCHAR(100);

UPDATE pedido p
   SET nome_cliente = c.nome
  FROM cliente c
 WHERE c.id = p.cliente_id;

-- Todo pedido tem o nome do cliente, como `cliente.nome`.
ALTER TABLE pedido ALTER COLUMN nome_cliente SET NOT NULL;
