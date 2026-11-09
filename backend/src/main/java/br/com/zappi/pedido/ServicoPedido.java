package br.com.zappi.pedido;

import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.zappi.mensagem.MensagemWhatsappRepositorio;
import br.com.zappi.seguranca.UsuarioAutenticado;

/**
 * Consulta dos pedidos do estabelecimento da usuária logada (ZAP-44). O estabelecimento vem
 * do token, nunca da requisição (RN01, ISO 27002 5.34).
 */
@Service
public class ServicoPedido {

	/** Por coluna do quadro, e dentro dela pela data de retirada e pelo número. */
	private static final Sort ORDEM = Sort.by("status", "dataRetirada", "numero");

	private static final Set<StatusPedido> SEM_RECUSADOS = EnumSet.complementOf(EnumSet.of(StatusPedido.RECUSADO));

	private final PedidoRepositorio pedidos;

	private final ItemPedidoRepositorio itens;

	private final MensagemWhatsappRepositorio mensagens;

	public ServicoPedido(PedidoRepositorio pedidos, ItemPedidoRepositorio itens, MensagemWhatsappRepositorio mensagens) {
		this.pedidos = pedidos;
		this.itens = itens;
		this.mensagens = mensagens;
	}

	/**
	 * Pedido completo pelo número (ZAP-45), com os itens e as mensagens geradas. Número de
	 * outro estabelecimento é tratado como inexistente (RN01).
	 */
	@Transactional(readOnly = true)
	public RespostaPedido detalhar(UsuarioAutenticado usuario, Integer numero) {
		Pedido pedido = pedidos.findByEstabelecimentoIdAndNumero(usuario.estabelecimentoId(), numero)
			.orElseThrow(PedidoNaoEncontradoException::new);
		return RespostaPedido.de(pedido, itens.buscarDosPedidos(List.of(pedido.getId())),
				mensagens.findByPedidoIdOrderByCriadoEmAscIdAsc(pedido.getId()));
	}

	/** Os recusados só vêm com o filtro ligado (RN04). */
	@Transactional(readOnly = true)
	public List<RespostaPedido> listar(UsuarioAutenticado usuario, boolean comRecusados) {
		Set<StatusPedido> status = comRecusados ? EnumSet.allOf(StatusPedido.class) : SEM_RECUSADOS;
		List<Pedido> encontrados = pedidos.findByEstabelecimentoIdAndStatusIn(usuario.estabelecimentoId(), status, ORDEM);
		if (encontrados.isEmpty()) {
			return List.of();
		}

		// Itens de todos os pedidos numa consulta só, sem uma consulta por pedido
		Map<Long, List<ItemPedido>> itensPorPedido = itens
			.buscarDosPedidos(encontrados.stream().map(Pedido::getId).toList())
			.stream()
			.collect(Collectors.groupingBy(item -> item.getPedido().getId()));
		return encontrados.stream()
			.map(pedido -> RespostaPedido.de(pedido, itensPorPedido.getOrDefault(pedido.getId(), List.of())))
			.toList();
	}

}
