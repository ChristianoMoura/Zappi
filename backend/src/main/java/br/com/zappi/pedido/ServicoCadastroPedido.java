package br.com.zappi.pedido;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.zappi.auditoria.AcaoAuditoria;
import br.com.zappi.auditoria.RegistroAuditoria;
import br.com.zappi.auditoria.ServicoAuditoria;
import br.com.zappi.cliente.Cliente;
import br.com.zappi.cliente.ClienteRepositorio;
import br.com.zappi.erro.DadosInvalidosException;
import br.com.zappi.estabelecimento.Estabelecimento;
import br.com.zappi.estabelecimento.EstabelecimentoNaoEncontradoException;
import br.com.zappi.estabelecimento.EstabelecimentoRepositorio;
import br.com.zappi.pedido.RequisicaoPedido.ItemDaRequisicao;
import br.com.zappi.produto.Produto;
import br.com.zappi.produto.ProdutoRepositorio;
import br.com.zappi.produto.UnidadeMedida;
import br.com.zappi.seguranca.UsuarioAutenticado;
import jakarta.persistence.EntityManager;

/**
 * Cadastro do pedido pela Lídia (ZAP-88). O pedido, os itens, o cliente e o
 * log são gravados na mesma transação (RN08): se qualquer parte falhar, nada fica gravado.
 */
@Service
public class ServicoCadastroPedido {

	private static final String ENTIDADE = "pedido";

	/** "Hoje" é o dia na confeitaria, não no servidor. */
	private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

	private static final String DATA_PASSADA = "A data de retirada já passou. Escolha hoje ou um dia depois.";

	private static final String PRODUTO_FORA_DO_CARDAPIO = "Escolha um produto do cardápio.";

	private static final String QUANTIDADE_INTEIRA = "Este produto é vendido por unidade: use um número inteiro.";

	private final PedidoRepositorio pedidos;

	private final ItemPedidoRepositorio itens;

	private final ClienteRepositorio clientes;

	private final ProdutoRepositorio produtos;

	private final EstabelecimentoRepositorio estabelecimentos;

	private final ServicoAuditoria auditoria;

	private final ServicoPedido consulta;

	private final EntityManager entityManager;

	public ServicoCadastroPedido(PedidoRepositorio pedidos, ItemPedidoRepositorio itens, ClienteRepositorio clientes,
			ProdutoRepositorio produtos, EstabelecimentoRepositorio estabelecimentos, ServicoAuditoria auditoria,
			ServicoPedido consulta, EntityManager entityManager) {
		this.pedidos = pedidos;
		this.itens = itens;
		this.clientes = clientes;
		this.produtos = produtos;
		this.estabelecimentos = estabelecimentos;
		this.auditoria = auditoria;
		this.consulta = consulta;
		this.entityManager = entityManager;
	}

	/**
	 * Cadastra o pedido como Novo (ZAP-88, RF07), com o próximo número do estabelecimento
	 * (RN09), o preço atual de cada produto congelado no item (RN10) e o total calculado aqui
	 * (RN11). O cliente é achado pelo WhatsApp ou criado com o consentimento (RN16).
	 */
	@Transactional
	public RespostaPedido cadastrar(UsuarioAutenticado usuario, RequisicaoPedido requisicao) {
		OffsetDateTime agora = OffsetDateTime.now(ZoneOffset.UTC);
		Map<String, String> erros = new LinkedHashMap<>();
		if (requisicao.dataRetirada().isBefore(hoje())) {
			erros.put("dataRetirada", DATA_PASSADA);
		}
		Map<Long, Produto> doCardapio = produtosDoCardapio(usuario, requisicao.itens());
		List<ItemDaRequisicao> itensDaRequisicao = requisicao.itens();
		for (int i = 0; i < itensDaRequisicao.size(); i++) {
			ItemDaRequisicao item = itensDaRequisicao.get(i);
			conferirItem(erros, i, item, doCardapio.get(item.produtoId()));
		}
		if (!erros.isEmpty()) {
			throw new DadosInvalidosException(erros);
		}

		// Com o estabelecimento bloqueado, dois cadastros ao mesmo tempo recebem números seguidos
		Estabelecimento estabelecimento = bloquearEstabelecimento(usuario);
		Cliente cliente = clienteDoWhatsapp(estabelecimento, requisicao, agora);
		Integer numero = pedidos.proximoNumero(estabelecimento.getId());
		Pedido pedido = pedidos.save(new Pedido(estabelecimento, cliente, numero, requisicao.dataRetirada(),
				requisicao.observacao(), agora));

		List<ItemPedido> itensDoPedido = new ArrayList<>();
		for (ItemDaRequisicao item : itensDaRequisicao) {
			itensDoPedido.add(novoItem(pedido, doCardapio.get(item.produtoId()), item));
		}
		itens.saveAll(itensDoPedido);
		pedido.atualizarTotal(total(itensDoPedido));
		pedidos.flush();
		// Traz o criado_em, que o banco preenche
		entityManager.refresh(pedido);

		registrar(usuario, AcaoAuditoria.PEDIDO_CRIADO, pedido, Map.of("numero", numero, "clienteId",
				cliente.getId(), "valorTotal", dinheiro(pedido.getValorTotal()), "itens", itensDoPedido.size()));
		return consulta.detalhar(usuario, numero);
	}

	private Map<Long, Produto> produtosDoCardapio(UsuarioAutenticado usuario, List<ItemDaRequisicao> itensDaRequisicao) {
		List<Long> ids = itensDaRequisicao.stream().map(ItemDaRequisicao::produtoId).distinct().toList();
		if (ids.isEmpty()) {
			return Map.of();
		}
		return produtos.findByIdInAndEstabelecimentoIdAndAtivoTrue(ids, usuario.estabelecimentoId())
			.stream()
			.collect(Collectors.toMap(Produto::getId, Function.identity()));
	}

	/** Produto do cardápio e, se for vendido por unidade, quantidade inteira (RN12). */
	private static void conferirItem(Map<String, String> erros, int indice, ItemDaRequisicao item, Produto produto) {
		if (produto == null) {
			erros.put("itens[%d].produtoId".formatted(indice), PRODUTO_FORA_DO_CARDAPIO);
			return;
		}
		UnidadeMedida unidade = produto.getUnidadeMedida();
		if (!unidade.isPermiteFracao() && item.quantidade().stripTrailingZeros().scale() > 0) {
			erros.put("itens[%d].quantidade".formatted(indice), QUANTIDADE_INTEIRA);
		}
	}

	private Estabelecimento bloquearEstabelecimento(UsuarioAutenticado usuario) {
		return estabelecimentos.buscarParaNumerarPedido(usuario.estabelecimentoId())
			.orElseThrow(EstabelecimentoNaoEncontradoException::new);
	}

	/**
	 * O cliente com o mesmo WhatsApp no estabelecimento, como está, ou um cliente novo com o
	 * consentimento registrado (RN16). Chamar com o estabelecimento bloqueado, para dois
	 * cadastros do mesmo WhatsApp não criarem o cliente duas vezes.
	 */
	private Cliente clienteDoWhatsapp(Estabelecimento estabelecimento, RequisicaoPedido requisicao,
			OffsetDateTime agora) {
		return clientes.findByEstabelecimentoIdAndTelefoneWhatsapp(estabelecimento.getId(),
				requisicao.cliente().telefone())
			.orElseGet(() -> clientes.save(new Cliente(estabelecimento, requisicao.cliente().nome(),
					requisicao.cliente().telefone(), agora)));
	}

	private static ItemPedido novoItem(Pedido pedido, Produto produto, ItemDaRequisicao item) {
		return new ItemPedido(pedido, produto, produto.getPreco(), item.quantidade(), item.recheio(), item.cobertura(),
				item.observacao());
	}

	private static BigDecimal total(List<ItemPedido> itensDoPedido) {
		return itensDoPedido.stream()
			.map(ItemPedido::getSubtotal)
			.reduce(BigDecimal.ZERO, BigDecimal::add)
			.setScale(2, RoundingMode.HALF_UP);
	}

	private static LocalDate hoje() {
		return LocalDate.now(FUSO);
	}

	/** Valor em texto com 2 casas, ex.: {@code "292.50"}, como nos outros logs. */
	private static String dinheiro(BigDecimal valor) {
		return Objects.requireNonNull(valor).setScale(2, RoundingMode.HALF_UP).toPlainString();
	}

	private void registrar(UsuarioAutenticado usuario, AcaoAuditoria acao, Pedido pedido, Map<String, ?> detalhes) {
		auditoria.registrar(RegistroAuditoria.de(acao)
			.estabelecimento(usuario.estabelecimentoId())
			.usuario(usuario.usuarioId())
			.entidade(ENTIDADE, pedido.getId())
			.detalhes(detalhes));
	}

}
