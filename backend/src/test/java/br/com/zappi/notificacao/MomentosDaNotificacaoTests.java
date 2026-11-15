package br.com.zappi.notificacao;

import static br.com.zappi.notificacao.MomentoNotificacao.DUAS_HORAS;
import static br.com.zappi.notificacao.MomentoNotificacao.NO_DIA;
import static br.com.zappi.notificacao.MomentoNotificacao.VESPERA;
import static br.com.zappi.notificacao.ServicoNotificacao.momentosQueJaChegaram;
import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import br.com.zappi.pedido.StatusPedido;

/**
 * Momentos dos avisos de retirada próxima (decisão de 14/11/2026, ZAP-172), no horário de São
 * Paulo. A retirada de referência é sábado, 21/11/2026, às 15h.
 */
class MomentosDaNotificacaoTests {

	private static final LocalDateTime RETIRADA = LocalDateTime.of(2026, 11, 21, 15, 0);

	@Test
	void pedidoNovoAvisaNaVesperaAPartirDas8h() {
		assertThat(momentosQueJaChegaram(StatusPedido.NOVO, RETIRADA, em(20, 7, 59))).isEmpty();
		assertThat(momentosQueJaChegaram(StatusPedido.NOVO, RETIRADA, em(20, 8, 0))).containsExactly(VESPERA);
		assertThat(momentosQueJaChegaram(StatusPedido.NOVO, RETIRADA, em(20, 23, 59))).containsExactly(VESPERA);
	}

	@Test
	void pedidoNovoAvisaNoDiaAPartirDas8hSemAVespera() {
		// Madrugada do dia: a véspera já acabou e o aviso do dia ainda não começou
		assertThat(momentosQueJaChegaram(StatusPedido.NOVO, RETIRADA, em(21, 7, 59))).isEmpty();
		assertThat(momentosQueJaChegaram(StatusPedido.NOVO, RETIRADA, em(21, 8, 0))).containsExactly(NO_DIA);
		// O aviso de 2 horas antes não é para pedido Novo
		assertThat(momentosQueJaChegaram(StatusPedido.NOVO, RETIRADA, em(21, 14, 0))).containsExactly(NO_DIA);
	}

	@Test
	void pedidoNovoNaoAvisaAntesDaVespera() {
		assertThat(momentosQueJaChegaram(StatusPedido.NOVO, RETIRADA, em(19, 12, 0))).isEmpty();
	}

	@ParameterizedTest
	@EnumSource(value = StatusPedido.class, names = { "CONFIRMADO", "EM_PRODUCAO", "CONCLUIDO" })
	void pedidoEmAndamentoAvisaNoDiaAPartirDas8hEDuasHorasAntes(StatusPedido status) {
		// Sem aviso na véspera
		assertThat(momentosQueJaChegaram(status, RETIRADA, em(20, 12, 0))).isEmpty();
		assertThat(momentosQueJaChegaram(status, RETIRADA, em(21, 7, 59))).isEmpty();
		assertThat(momentosQueJaChegaram(status, RETIRADA, em(21, 8, 0))).containsExactly(NO_DIA);
		assertThat(momentosQueJaChegaram(status, RETIRADA, em(21, 12, 59))).containsExactly(NO_DIA);
		assertThat(momentosQueJaChegaram(status, RETIRADA, em(21, 13, 0))).containsExactly(NO_DIA, DUAS_HORAS);
	}

	@Test
	void retiradaCedoAvisaDuasHorasAntesMesmoAntesDas8h() {
		LocalDateTime retiradaAs9 = LocalDateTime.of(2026, 11, 21, 9, 0);

		assertThat(momentosQueJaChegaram(StatusPedido.CONFIRMADO, retiradaAs9, em(21, 6, 59))).isEmpty();
		assertThat(momentosQueJaChegaram(StatusPedido.CONFIRMADO, retiradaAs9, em(21, 7, 0)))
			.containsExactly(DUAS_HORAS);
		assertThat(momentosQueJaChegaram(StatusPedido.CONFIRMADO, retiradaAs9, em(21, 8, 0)))
			.containsExactly(NO_DIA, DUAS_HORAS);
	}

	private static LocalDateTime em(int dia, int hora, int minuto) {
		return LocalDateTime.of(2026, 11, dia, hora, minuto);
	}

}
