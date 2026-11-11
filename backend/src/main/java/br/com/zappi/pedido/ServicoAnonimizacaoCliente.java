package br.com.zappi.pedido;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.zappi.auditoria.AcaoAuditoria;
import br.com.zappi.auditoria.RegistroAuditoria;
import br.com.zappi.auditoria.ServicoAuditoria;
import br.com.zappi.cliente.Cliente;
import br.com.zappi.cliente.ClienteComPedidoEmAbertoException;
import br.com.zappi.cliente.ClienteJaAnonimizadoException;
import br.com.zappi.cliente.RemocaoDeDadosPessoais;
import br.com.zappi.estabelecimento.EstabelecimentoNaoEncontradoException;
import br.com.zappi.estabelecimento.EstabelecimentoRepositorio;
import br.com.zappi.mensagem.MensagemWhatsapp;
import br.com.zappi.mensagem.MensagemWhatsappRepositorio;
import br.com.zappi.seguranca.UsuarioAutenticado;

/**
 * Anonimização do cliente a pedido do titular (ZAP-115, US12, RF24, RN17, LGPD). A Lídia faz
 * pelos detalhes de um pedido do cliente. Tudo acontece numa transação só: se qualquer parte
 * falhar, nada é gravado.
 */
@Service
public class ServicoAnonimizacaoCliente {

	/** Com pedido nestes status, a Lídia ainda precisa do nome e do WhatsApp do cliente. */
	private static final Set<StatusPedido> EM_ABERTO = EnumSet.of(StatusPedido.NOVO, StatusPedido.CONFIRMADO,
			StatusPedido.EM_PRODUCAO);

	private final EstabelecimentoRepositorio estabelecimentos;

	private final PedidoRepositorio pedidos;

	private final MensagemWhatsappRepositorio mensagens;

	private final ServicoAuditoria auditoria;

	private final ServicoPedido consulta;

	public ServicoAnonimizacaoCliente(EstabelecimentoRepositorio estabelecimentos, PedidoRepositorio pedidos,
			MensagemWhatsappRepositorio mensagens, ServicoAuditoria auditoria, ServicoPedido consulta) {
		this.estabelecimentos = estabelecimentos;
		this.pedidos = pedidos;
		this.mensagens = mensagens;
		this.auditoria = auditoria;
		this.consulta = consulta;
	}

	/**
	 * Anonimiza o cliente do pedido {@code numero}:
	 * <ul>
	 * <li>recusa se ele tiver pedido Novo, Confirmado ou Em produção;</li>
	 * <li>em {@code cliente}, nome "Cliente anonimizado", telefone {@code 0} + id em 13 dígitos e
	 * {@code anonimizado_em};</li>
	 * <li>em {@code mensagem_whatsapp}, troca {@code telefone_destino} e tira o nome de
	 * {@code conteudo} (RN20);</li>
	 * <li>tira o nome e o telefone de {@code pedido.motivo_recusa}, que vai para a mensagem;</li>
	 * <li>tira o nome e o telefone de {@code log_auditoria.detalhes};</li>
	 * <li>registra {@code CLIENTE_ANONIMIZADO}, sem os dados antigos (ISO 27002 8.16).</li>
	 * </ul>
	 * Pedidos, itens, valores e observações não mudam. Pedido de outro estabelecimento é tratado
	 * como inexistente (RN01, ISO 27002 5.34).
	 *
	 * @return o pedido, já com o cliente anonimizado
	 */
	@Transactional
	public RespostaPedido anonimizar(UsuarioAutenticado usuario, Integer numero) {
		// Com o estabelecimento bloqueado, nenhum pedido novo entra para este WhatsApp no meio
		// da anonimização: o cadastro bloqueia a mesma linha antes de procurar o cliente
		estabelecimentos.buscarParaNumerarPedido(usuario.estabelecimentoId())
			.orElseThrow(EstabelecimentoNaoEncontradoException::new);
		Cliente cliente = pedidos.findByEstabelecimentoIdAndNumero(usuario.estabelecimentoId(), numero)
			.orElseThrow(PedidoNaoEncontradoException::new)
			.getCliente();
		if (cliente.getAnonimizadoEm() != null) {
			throw new ClienteJaAnonimizadoException();
		}
		List<Pedido> doCliente = pedidos.buscarDoClienteParaAlterar(cliente.getId());
		if (doCliente.stream().anyMatch(pedido -> EM_ABERTO.contains(pedido.getStatus()))) {
			throw new ClienteComPedidoEmAbertoException();
		}

		String nome = cliente.getNome();
		String telefone = cliente.getTelefoneWhatsapp();
		OffsetDateTime agora = OffsetDateTime.now(ZoneOffset.UTC);
		cliente.anonimizar(agora);
		RemocaoDeDadosPessoais remocao = new RemocaoDeDadosPessoais(nome, telefone, cliente.getTelefoneWhatsapp());

		// O motivo da recusa vai para a mensagem, então perde o nome do mesmo jeito; as
		// observações descrevem a encomenda e ficam como estão (RN17)
		for (Pedido pedido : doCliente) {
			if (pedido.getMotivoRecusa() != null) {
				pedido.substituirMotivoRecusa(remocao.daMensagem(pedido.getMotivoRecusa()), agora);
			}
		}
		pedidos.flush();

		List<MensagemWhatsapp> mensagensDoCliente = mensagens.findByPedidoClienteId(cliente.getId());
		for (MensagemWhatsapp mensagem : mensagensDoCliente) {
			mensagem.anonimizar(cliente.getTelefoneWhatsapp(), remocao.daMensagem(mensagem.getConteudo()));
		}
		mensagens.flush();

		int registrosDoLog = auditoria.substituirNosDetalhes(usuario.estabelecimentoId(), nome.trim(), telefone,
				remocao::doLog);

		auditoria.registrar(RegistroAuditoria.de(AcaoAuditoria.CLIENTE_ANONIMIZADO)
			.estabelecimento(usuario.estabelecimentoId())
			.usuario(usuario.usuarioId())
			.entidade("cliente", cliente.getId())
			.detalhes(Map.of("numeroPedido", numero, "pedidos", doCliente.size(), "mensagens",
					mensagensDoCliente.size(), "registrosDoLog", registrosDoLog)));
		return consulta.detalhar(usuario, numero);
	}

}
