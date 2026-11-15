package br.com.zappi.notificacao;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.zappi.pedido.Pedido;
import br.com.zappi.pedido.PedidoRepositorio;
import br.com.zappi.pedido.StatusPedido;
import br.com.zappi.seguranca.UsuarioAutenticado;

/**
 * Caixa de notificações do painel (ZAP-172, ZAP-174). O backend gratuito do Render dorme sem
 * acesso, então não há tarefa agendada: os avisos de retirada próxima são gerados quando o
 * painel pergunta quantas notificações não vistas existem, e cada aviso é gravado uma vez só
 * por pedido e momento. Tudo é filtrado pelo estabelecimento do token (RN01, ISO 27002 5.15).
 */
@Service
public class ServicoNotificacao {

	/** As horas da confeitaria, não as do servidor. */
	private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

	/** A caixinha mostra as notificações dos últimos 30 dias (ZAP-172). */
	static final int DIAS_NA_CAIXINHA = 30;

	/** Avisos da véspera e do dia começam às 8h. */
	private static final LocalTime INICIO_DOS_AVISOS = LocalTime.of(8, 0);

	private static final int HORAS_ANTES = 2;

	/**
	 * Status que recebem aviso de retirada. Entregue (ZAP-60) e Recusado ficam de fora: uma lista
	 * do que entra, para um status novo não gerar aviso sem querer.
	 */
	private static final Set<StatusPedido> COM_AVISO_DE_RETIRADA = EnumSet.of(StatusPedido.NOVO,
			StatusPedido.CONFIRMADO, StatusPedido.EM_PRODUCAO, StatusPedido.CONCLUIDO);

	private final NotificacaoRepositorio notificacoes;

	private final PedidoRepositorio pedidos;

	private final Clock relogio;

	@Autowired
	public ServicoNotificacao(NotificacaoRepositorio notificacoes, PedidoRepositorio pedidos) {
		this(notificacoes, pedidos, Clock.system(FUSO));
	}

	ServicoNotificacao(NotificacaoRepositorio notificacoes, PedidoRepositorio pedidos, Clock relogio) {
		this.notificacoes = notificacoes;
		this.pedidos = pedidos;
		this.relogio = relogio;
	}

	/**
	 * Pedido que chegou pelo Portal do Cliente. Chamar dentro da transação que grava o pedido
	 * (ZAP-109): se o pedido falhar, a notificação também não fica.
	 */
	public void novoPedido(Pedido pedido) {
		notificacoes.gravarSeNaoExiste(pedido.getEstabelecimento().getId(), pedido.getId(),
				TipoNotificacao.NOVO_PEDIDO.getCodigo(), null);
	}

	/**
	 * Quantas notificações dos últimos 30 dias a Lídia ainda não viu, depois de gerar os avisos
	 * de retirada que já chegaram. Chamado pelo sino a cada 1 minuto.
	 */
	@Transactional
	public long contarNaoVistas(UsuarioAutenticado usuario) {
		ZonedDateTime agora = ZonedDateTime.now(relogio.withZone(FUSO));
		gerarRetiradasProximas(usuario.estabelecimentoId(), agora.toLocalDateTime());
		return notificacoes.countByEstabelecimentoIdAndVistaEmIsNullAndCriadoEmGreaterThanEqual(
				usuario.estabelecimentoId(), inicioDaCaixinha(agora));
	}

	/** Notificações dos últimos 30 dias, mais recentes primeiro, com o texto montado agora. */
	@Transactional(readOnly = true)
	public List<RespostaNotificacao> listar(UsuarioAutenticado usuario) {
		ZonedDateTime agora = ZonedDateTime.now(relogio.withZone(FUSO));
		LocalDate hoje = agora.toLocalDate();
		return notificacoes.recentes(usuario.estabelecimentoId(), inicioDaCaixinha(agora))
			.stream()
			.map(notificacao -> RespostaNotificacao.de(notificacao, TextoDaNotificacao.de(notificacao, hoje)))
			.toList();
	}

	/**
	 * A Lídia abriu a caixinha: as notificações exibidas passam a ser vistas. Ids de outra loja
	 * são ignorados (RN01).
	 */
	@Transactional
	public void marcarVistas(UsuarioAutenticado usuario, Collection<Long> ids) {
		if (ids.isEmpty()) {
			return;
		}
		notificacoes.marcarVistas(usuario.estabelecimentoId(), ids, OffsetDateTime.now(relogio));
	}

	/**
	 * Grava os avisos de retirada próxima cujo momento já chegou e cuja retirada ainda não
	 * passou, no horário de São Paulo. Os já gravados são ignorados pelo banco.
	 *
	 * @param agora data e hora atuais em São Paulo
	 */
	void gerarRetiradasProximas(Long estabelecimentoId, LocalDateTime agora) {
		// O aviso mais cedo é o da véspera: só interessam as retiradas até o fim de amanhã
		LocalDateTime depoisDeAmanha = agora.toLocalDate().plusDays(2).atStartOfDay();
		List<Pedido> candidatos = pedidos.findByEstabelecimentoIdAndStatusInAndDataRetiradaAfterAndDataRetiradaBefore(
				estabelecimentoId, COM_AVISO_DE_RETIRADA, agora, depoisDeAmanha);
		for (Pedido pedido : candidatos) {
			for (MomentoNotificacao momento : momentosQueJaChegaram(pedido.getStatus(), pedido.getDataRetirada(),
					agora)) {
				notificacoes.gravarSeNaoExiste(estabelecimentoId, pedido.getId(),
						TipoNotificacao.RETIRADA_PROXIMA.getCodigo(), momento.name());
			}
		}
	}

	/**
	 * Momentos de aviso de um pedido que já chegaram em {@code agora} (decisão de 14/11/2026,
	 * ZAP-172). Quem chama garante que a retirada ainda não passou.
	 * <ul>
	 * <li>Novo: {@code VESPERA}, das 8h do dia anterior até o fim desse dia, e {@code NO_DIA},
	 * a partir das 8h do dia da retirada;</li>
	 * <li>Confirmado, Em produção e Concluído: {@code NO_DIA}, a partir das 8h do dia da
	 * retirada, e {@code DUAS_HORAS}, a partir de 2 horas antes.</li>
	 * </ul>
	 * A véspera termina à meia-noite: aberto só no dia, o painel mostra o aviso do dia, sem um
	 * "amanhã" que já é hoje.
	 */
	static List<MomentoNotificacao> momentosQueJaChegaram(StatusPedido status, LocalDateTime retirada,
			LocalDateTime agora) {
		List<MomentoNotificacao> momentos = new ArrayList<>();
		LocalDate diaDaRetirada = retirada.toLocalDate();
		LocalDate hoje = agora.toLocalDate();
		boolean depoisDas8 = !agora.toLocalTime().isBefore(INICIO_DOS_AVISOS);
		if (status == StatusPedido.NOVO) {
			if (hoje.equals(diaDaRetirada.minusDays(1)) && depoisDas8) {
				momentos.add(MomentoNotificacao.VESPERA);
			}
			if (hoje.equals(diaDaRetirada) && depoisDas8) {
				momentos.add(MomentoNotificacao.NO_DIA);
			}
			return momentos;
		}
		if (hoje.equals(diaDaRetirada) && depoisDas8) {
			momentos.add(MomentoNotificacao.NO_DIA);
		}
		if (!agora.isBefore(retirada.minusHours(HORAS_ANTES))) {
			momentos.add(MomentoNotificacao.DUAS_HORAS);
		}
		return momentos;
	}

	private static OffsetDateTime inicioDaCaixinha(ZonedDateTime agora) {
		return agora.minusDays(DIAS_NA_CAIXINHA).toOffsetDateTime();
	}

}
