package br.com.zappi.notificacao;

/**
 * Momento do aviso de retirada próxima, gravado pelo nome em {@code notificacao.momento}.
 * Decisão da equipe em 14/11/2026 (ZAP-172), sempre no horário de São Paulo.
 */
public enum MomentoNotificacao {

	/** Pedido Novo, na véspera da retirada, a partir das 8h. */
	VESPERA,
	/** No dia da retirada, a partir das 8h. */
	NO_DIA,
	/** A partir de 2 horas antes da retirada, para pedidos Confirmado, Em produção ou Concluído. */
	DUAS_HORAS

}
