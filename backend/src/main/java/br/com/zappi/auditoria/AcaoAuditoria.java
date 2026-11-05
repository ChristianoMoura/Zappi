package br.com.zappi.auditoria;

/**
 * Ações registradas em {@code log_auditoria.acao} (seção 10 do context.md, ISO 27002 8.16).
 */
public enum AcaoAuditoria {

	LOGIN_SUCESSO,
	LOGIN_FALHA,
	ESTABELECIMENTO_EDITADO,
	PRODUTO_CRIADO,
	PRODUTO_EDITADO,
	PRODUTO_EXCLUIDO,
	PEDIDO_CONFIRMADO,
	PEDIDO_RECUSADO,
	PEDIDO_STATUS_ALTERADO

}
