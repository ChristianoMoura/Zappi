package br.com.zappi.notificacao;

import java.time.LocalDate;
import java.time.LocalDateTime;

import br.com.zappi.pedido.Pedido;
import br.com.zappi.pedido.StatusPedido;

/**
 * Monta o texto da notificação na hora da leitura, a partir do pedido (ZAP-172). Usa só o
 * número e a data do pedido, nunca o nome ou o telefone do cliente (RN17), e o status atual:
 * um pedido confirmado depois do aviso perde o "ainda não foi confirmado". Linguagem simples
 * (NBR 17225 5.12.12).
 */
final class TextoDaNotificacao {

	/** Dias da semana abreviados, como no exemplo da ZAP-172 ("sáb, 22/11, 15h"). */
	private static final String[] DIAS = { "seg", "ter", "qua", "qui", "sex", "sáb", "dom" };

	private TextoDaNotificacao() {
	}

	/**
	 * @param hoje dia de hoje no horário de São Paulo, para dizer "hoje" ou "amanhã"
	 */
	static String de(Notificacao notificacao, LocalDate hoje) {
		Pedido pedido = notificacao.getPedido();
		LocalDateTime retirada = pedido.getDataRetirada();
		if (notificacao.getTipo() == TipoNotificacao.NOVO_PEDIDO) {
			// "Novo pedido #12. Retirada: sáb, 22/11, 15h"
			return "Novo pedido #%d. Retirada: %s".formatted(pedido.getNumero(), dataCurta(retirada));
		}
		if (notificacao.getMomento() == MomentoNotificacao.DUAS_HORAS) {
			// "Pedido #9 é retirado às 15h, daqui a 2 horas"
			return "Pedido #%d é retirado às %s, daqui a 2 horas".formatted(pedido.getNumero(), hora(retirada));
		}
		// VESPERA e NO_DIA: "Pedido #9 é retirado hoje às 15h"; com o pedido ainda Novo,
		// "Pedido #12 ainda não foi confirmado e é retirado amanhã às 15h"
		String quando = "%s às %s".formatted(dia(retirada.toLocalDate(), hoje), hora(retirada));
		if (pedido.getStatus() == StatusPedido.NOVO) {
			return "Pedido #%d ainda não foi confirmado e é retirado %s".formatted(pedido.getNumero(), quando);
		}
		return "Pedido #%d é retirado %s".formatted(pedido.getNumero(), quando);
	}

	/** "hoje", "amanhã" ou, lido depois, "sáb, 22/11". */
	private static String dia(LocalDate data, LocalDate hoje) {
		if (data.equals(hoje)) {
			return "hoje";
		}
		if (data.equals(hoje.plusDays(1))) {
			return "amanhã";
		}
		return "%s, %02d/%02d".formatted(DIAS[data.getDayOfWeek().getValue() - 1], data.getDayOfMonth(),
				data.getMonthValue());
	}

	/** "sáb, 22/11, 15h". */
	private static String dataCurta(LocalDateTime retirada) {
		LocalDate data = retirada.toLocalDate();
		return "%s, %02d/%02d, %s".formatted(DIAS[data.getDayOfWeek().getValue() - 1], data.getDayOfMonth(),
				data.getMonthValue(), hora(retirada));
	}

	/** "15h", ou "15h30" fora da hora cheia, como nas mensagens ao cliente (ZAP-127). */
	private static String hora(LocalDateTime retirada) {
		int minutos = retirada.getMinute();
		return minutos == 0 ? retirada.getHour() + "h" : "%dh%02d".formatted(retirada.getHour(), minutos);
	}

}
