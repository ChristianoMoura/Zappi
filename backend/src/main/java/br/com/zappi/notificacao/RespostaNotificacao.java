package br.com.zappi.notificacao;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;

/**
 * Notificação como a caixinha do sino espera (ZAP-175, comentário da ZAP-174). {@code tipo}: 1
 * novo pedido, 2 retirada próxima; {@code momento}: nulo, {@code VESPERA}, {@code NO_DIA} ou
 * {@code DUAS_HORAS}; {@code dataRetirada} no horário de São Paulo e {@code criadoEm} em UTC,
 * como nos pedidos.
 */
public record RespostaNotificacao(Long id, int tipo, String momento, Integer numeroPedido,
		LocalDateTime dataRetirada, OffsetDateTime criadoEm, boolean vista, String texto) {

	static RespostaNotificacao de(Notificacao notificacao, String texto) {
		MomentoNotificacao momento = notificacao.getMomento();
		return new RespostaNotificacao(notificacao.getId(), notificacao.getTipo().getCodigo(),
				momento == null ? null : momento.name(), notificacao.getPedido().getNumero(),
				notificacao.getPedido().getDataRetirada(), notificacao.getCriadoEm(), notificacao.isVista(), texto);
	}

}
