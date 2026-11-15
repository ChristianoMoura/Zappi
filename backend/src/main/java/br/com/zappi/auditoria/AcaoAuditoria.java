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
	PEDIDO_CRIADO,
	PEDIDO_EDITADO,
	PEDIDO_CONFIRMADO,
	PEDIDO_RECUSADO,
	PEDIDO_STATUS_ALTERADO,
	CLIENTE_ANONIMIZADO,
	PEDIDO_PUBLICO_RECUSADO,
	CATEGORIA_CRIADA,
	/** Nome ou ordem (ZAP-136). Na ordem, o log guarda a lista de ids antes e depois. */
	CATEGORIA_EDITADA,
	CATEGORIA_EXCLUIDA,
	/** Aceite dos Termos de uso e da Política de privacidade no login (ZAP-146); o log guarda a versão. */
	TERMOS_ACEITOS

}
