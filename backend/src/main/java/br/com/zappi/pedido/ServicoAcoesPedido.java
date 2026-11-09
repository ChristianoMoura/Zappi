package br.com.zappi.pedido;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Consumer;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.zappi.auditoria.AcaoAuditoria;
import br.com.zappi.auditoria.RegistroAuditoria;
import br.com.zappi.auditoria.ServicoAuditoria;
import br.com.zappi.mensagem.GeradorDeMensagens;
import br.com.zappi.mensagem.MensagemNaoEncontradaException;
import br.com.zappi.mensagem.MensagemWhatsapp;
import br.com.zappi.mensagem.MensagemWhatsappRepositorio;
import br.com.zappi.mensagem.StatusMensagem;
import br.com.zappi.mensagem.TipoMensagem;
import br.com.zappi.seguranca.UsuarioAutenticado;
import jakarta.persistence.EntityManager;

/**
 * Ações da Lídia sobre os pedidos. Mudar o status, gerar a mensagem e gravar o log acontecem
 * na mesma transação (RN08): se qualquer parte falhar, nada é gravado. O pedido fica
 * bloqueado durante a ação, para duas ações ao mesmo tempo não passarem juntas.
 */
@Service
public class ServicoAcoesPedido {

	private static final String ENTIDADE = "pedido";

	private final PedidoRepositorio pedidos;

	private final ItemPedidoRepositorio itens;

	private final MensagemWhatsappRepositorio mensagens;

	private final GeradorDeMensagens gerador;

	private final ServicoAuditoria auditoria;

	private final ServicoPedido consulta;

	private final EntityManager entityManager;

	public ServicoAcoesPedido(PedidoRepositorio pedidos, ItemPedidoRepositorio itens,
			MensagemWhatsappRepositorio mensagens, GeradorDeMensagens gerador, ServicoAuditoria auditoria,
			ServicoPedido consulta, EntityManager entityManager) {
		this.pedidos = pedidos;
		this.itens = itens;
		this.mensagens = mensagens;
		this.gerador = gerador;
		this.auditoria = auditoria;
		this.consulta = consulta;
		this.entityManager = entityManager;
	}

	/**
	 * Confirma um pedido Novo (ZAP-49, RF09): Confirmado com {@code confirmado_em}, mensagem de
	 * Confirmação Pendente para o telefone atual do cliente (RN07, RN20) e o log
	 * {@code PEDIDO_CONFIRMADO}. Devolve o pedido completo, já com a mensagem e o link.
	 */
	@Transactional
	public RespostaPedido confirmar(UsuarioAutenticado usuario, Integer numero) {
		Pedido pedido = pedidos.buscarParaAlterar(usuario.estabelecimentoId(), numero)
			.orElseThrow(PedidoNaoEncontradoException::new);
		StatusPedido antes = pedido.getStatus();
		pedido.confirmar(OffsetDateTime.now(ZoneOffset.UTC));

		List<ItemPedido> itensDoPedido = itens.buscarDosPedidos(List.of(pedido.getId()));
		MensagemWhatsapp mensagem = gerarMensagem(pedido, TipoMensagem.CONFIRMACAO,
				gerador.confirmacao(pedido, itensDoPedido));

		registrar(usuario, AcaoAuditoria.PEDIDO_CONFIRMADO, pedido, Map.of("numero", pedido.getNumero(), "statusAntes",
				antes.name(), "statusDepois", pedido.getStatus().name(), "mensagemId", mensagem.getId()));
		return consulta.detalhar(usuario, numero);
	}

	/**
	 * Recusa um pedido Novo ou cancela um Confirmado ou Em produção (ZAP-53, RF11, ZAP-64): vai
	 * para Recusado com o motivo e {@code recusado_em}, gera a mensagem de Recusa com o motivo
	 * no texto (RN07, RN20) e registra {@code PEDIDO_RECUSADO} com o motivo e o status anterior.
	 */
	@Transactional
	public RespostaPedido recusar(UsuarioAutenticado usuario, Integer numero, String motivo) {
		Pedido pedido = pedidos.buscarParaAlterar(usuario.estabelecimentoId(), numero)
			.orElseThrow(PedidoNaoEncontradoException::new);
		StatusPedido antes = pedido.getStatus();
		pedido.recusar(motivo, OffsetDateTime.now(ZoneOffset.UTC));

		MensagemWhatsapp mensagem = gerarMensagem(pedido, TipoMensagem.RECUSA, gerador.recusa(pedido));

		registrar(usuario, AcaoAuditoria.PEDIDO_RECUSADO, pedido,
				Map.of("numero", pedido.getNumero(), "statusAntes", antes.name(), "statusDepois",
						pedido.getStatus().name(), "cancelamento", antes != StatusPedido.NOVO, "motivo", motivo,
						"mensagemId", mensagem.getId()));
		return consulta.detalhar(usuario, numero);
	}

	/** Confirmado → Em produção, gravando {@code producao_em} (ZAP-75). Não gera mensagem. */
	@Transactional
	public RespostaPedido iniciarProducao(UsuarioAutenticado usuario, Integer numero) {
		mudarStatus(usuario, numero, pedido -> pedido.iniciarProducao(OffsetDateTime.now(ZoneOffset.UTC)));
		return consulta.detalhar(usuario, numero);
	}

	/**
	 * Volta de Em produção para Confirmado, apagando {@code producao_em} (ZAP-75). Se o pedido
	 * foi editado em produção, a mensagem de confirmação é atualizada (ZAP-90).
	 */
	@Transactional
	public RespostaPedido voltarParaConfirmado(UsuarioAutenticado usuario, Integer numero) {
		Pedido pedido = mudarStatus(usuario, numero,
				alvo -> alvo.voltarParaConfirmado(OffsetDateTime.now(ZoneOffset.UTC)));
		atualizarConfirmacao(pedido, itens.buscarDosPedidos(List.of(pedido.getId())));
		return consulta.detalhar(usuario, numero);
	}

	/**
	 * Deixa a confirmação de acordo com o pedido Confirmado depois de uma mudança (ZAP-90). Se
	 * o texto mudou: com a última confirmação ainda não enviada, o texto dela é trocado; já
	 * enviada, uma confirmação nova, Pendente, é gerada para a Lídia mandar de novo. Sem
	 * confirmação anterior, ou com o mesmo texto, nada muda.
	 *
	 * @return a mensagem atualizada ou gerada, ou vazio quando nada mudou
	 */
	Optional<MensagemWhatsapp> atualizarConfirmacao(Pedido pedido, List<ItemPedido> itensDoPedido) {
		Optional<MensagemWhatsapp> ultima = mensagens.findByPedidoIdOrderByCriadoEmAscIdAsc(pedido.getId())
			.stream()
			.filter(m -> m.getTipo() == TipoMensagem.CONFIRMACAO)
			.reduce((anterior, seguinte) -> seguinte);
		if (ultima.isEmpty()) {
			return Optional.empty();
		}
		String texto = gerador.confirmacao(pedido, itensDoPedido);
		MensagemWhatsapp mensagem = ultima.get();
		if (texto.equals(mensagem.getConteudo())) {
			return Optional.empty();
		}
		if (mensagem.getStatus() != StatusMensagem.ENVIADA) {
			mensagem.atualizarConteudo(texto);
			mensagens.flush();
			return Optional.of(mensagem);
		}
		return Optional.of(gerarMensagem(pedido, TipoMensagem.CONFIRMACAO, texto));
	}

	/**
	 * Volta de Concluído para Em produção, apagando {@code concluido_em} (ZAP-75). Informa se a
	 * mensagem de pronto já tinha sido enviada, para a tela avisar a Lídia (ZAP-64).
	 */
	@Transactional
	public RespostaPedido voltarParaProducao(UsuarioAutenticado usuario, Integer numero) {
		Pedido pedido = mudarStatus(usuario, numero,
				alvo -> alvo.voltarParaProducao(OffsetDateTime.now(ZoneOffset.UTC)));
		boolean prontoEnviado = mensagens.findByPedidoIdOrderByCriadoEmAscIdAsc(pedido.getId())
			.stream()
			.anyMatch(m -> m.getTipo() == TipoMensagem.PRONTO && m.getStatus() == StatusMensagem.ENVIADA);
		return consulta.detalhar(usuario, numero).comAvisoDeProntoEnviado(prontoEnviado);
	}

	/**
	 * Conclui um pedido Em produção (ZAP-76): Concluído com {@code concluido_em}, mensagem de
	 * Pronto para retirada Pendente para o telefone atual do cliente (RN07, RN20) e o log
	 * {@code PEDIDO_STATUS_ALTERADO}. Concluir de novo depois de uma volta gera outra mensagem.
	 */
	@Transactional
	public RespostaPedido concluir(UsuarioAutenticado usuario, Integer numero) {
		Pedido pedido = pedidos.buscarParaAlterar(usuario.estabelecimentoId(), numero)
			.orElseThrow(PedidoNaoEncontradoException::new);
		StatusPedido antes = pedido.getStatus();
		pedido.concluir(OffsetDateTime.now(ZoneOffset.UTC));

		MensagemWhatsapp mensagem = gerarMensagem(pedido, TipoMensagem.PRONTO, gerador.pronto(pedido));

		registrar(usuario, AcaoAuditoria.PEDIDO_STATUS_ALTERADO, pedido, Map.of("numero", pedido.getNumero(),
				"statusAntes", antes.name(), "statusDepois", pedido.getStatus().name(), "mensagemId", mensagem.getId()));
		return consulta.detalhar(usuario, numero);
	}

	/**
	 * Mudança de status sem mensagem: bloqueia o pedido, aplica a transição e registra
	 * {@code PEDIDO_STATUS_ALTERADO} com o status anterior e o novo (RN08, ISO 27002 8.16).
	 */
	private Pedido mudarStatus(UsuarioAutenticado usuario, Integer numero, Consumer<Pedido> transicao) {
		Pedido pedido = pedidos.buscarParaAlterar(usuario.estabelecimentoId(), numero)
			.orElseThrow(PedidoNaoEncontradoException::new);
		StatusPedido antes = pedido.getStatus();
		transicao.accept(pedido);
		pedidos.flush();
		registrar(usuario, AcaoAuditoria.PEDIDO_STATUS_ALTERADO, pedido, Map.of("numero", pedido.getNumero(),
				"statusAntes", antes.name(), "statusDepois", pedido.getStatus().name()));
		return pedido;
	}

	/** Mensagem nova, Pendente, para o telefone atual do cliente (RN07, RN20). */
	private MensagemWhatsapp gerarMensagem(Pedido pedido, TipoMensagem tipo, String texto) {
		MensagemWhatsapp mensagem = mensagens
			.saveAndFlush(new MensagemWhatsapp(pedido, tipo, pedido.getCliente().getTelefoneWhatsapp(), texto));
		// Traz o criado_em, que o banco preenche
		entityManager.refresh(mensagem);
		return mensagem;
	}

	/** Log na mesma transação da ação (RN08, ISO 27002 8.16). */
	private void registrar(UsuarioAutenticado usuario, AcaoAuditoria acao, Pedido pedido, Map<String, ?> detalhes) {
		auditoria.registrar(RegistroAuditoria.de(acao)
			.estabelecimento(usuario.estabelecimentoId())
			.usuario(usuario.usuarioId())
			.entidade(ENTIDADE, pedido.getId())
			.detalhes(detalhes));
	}

	/**
	 * Marca a mensagem como Enviada quando a Lídia clica em "Enviar no WhatsApp" (ZAP-50). Pode
	 * ser chamada de novo ao reenviar, sem erro, mantendo a data do primeiro envio (ZAP-64).
	 */
	@Transactional
	public RespostaPedido marcarMensagemEnviada(UsuarioAutenticado usuario, Integer numero, Long idMensagem) {
		MensagemWhatsapp mensagem = mensagens.buscarDoPedido(idMensagem, numero, usuario.estabelecimentoId())
			.orElseThrow(MensagemNaoEncontradaException::new);
		mensagem.marcarEnviada(OffsetDateTime.now(ZoneOffset.UTC));
		mensagens.flush();
		return consulta.detalhar(usuario, numero);
	}

}
