package br.com.zappi.pedido;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
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
import br.com.zappi.mensagem.MensagemWhatsapp;
import br.com.zappi.pedido.RequisicaoPedido.ItemDaRequisicao;
import br.com.zappi.produto.Produto;
import br.com.zappi.produto.ProdutoRepositorio;
import br.com.zappi.produto.UnidadeMedida;
import br.com.zappi.seguranca.UsuarioAutenticado;
import jakarta.persistence.EntityManager;

/**
 * Cadastro (ZAP-88) e edição (ZAP-90) do pedido pela Lídia. O pedido, os itens, o cliente e o
 * log são gravados na mesma transação (RN08): se qualquer parte falhar, nada fica gravado.
 */
@Service
public class ServicoCadastroPedido {

	private static final String ENTIDADE = "pedido";

	/** "Hoje" é o dia na confeitaria, não no servidor. */
	private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

	private static final String DATA_PASSADA = "A data e o horário de retirada já passaram. Escolha um horário a partir de agora.";

	private static final String HORARIO_FORA = "Escolha um horário entre 8h e 20h, de 30 em 30 minutos.";

	private static final LocalTime PRIMEIRA_RETIRADA = LocalTime.of(8, 0);

	private static final LocalTime ULTIMA_RETIRADA = LocalTime.of(20, 0);

	private static final String PRODUTO_FORA_DO_CARDAPIO = "Escolha um produto do cardápio.";

	private static final String QUANTIDADE_INTEIRA = "Este produto é vendido por unidade: use um número inteiro.";

	private final PedidoRepositorio pedidos;

	private final ItemPedidoRepositorio itens;

	private final ClienteRepositorio clientes;

	private final ProdutoRepositorio produtos;

	private final EstabelecimentoRepositorio estabelecimentos;

	private final ServicoAuditoria auditoria;

	private final ServicoAcoesPedido acoes;

	private final ServicoPedido consulta;

	private final EntityManager entityManager;

	public ServicoCadastroPedido(PedidoRepositorio pedidos, ItemPedidoRepositorio itens, ClienteRepositorio clientes,
			ProdutoRepositorio produtos, EstabelecimentoRepositorio estabelecimentos, ServicoAuditoria auditoria,
			ServicoAcoesPedido acoes, ServicoPedido consulta, EntityManager entityManager) {
		this.pedidos = pedidos;
		this.itens = itens;
		this.clientes = clientes;
		this.produtos = produtos;
		this.estabelecimentos = estabelecimentos;
		this.auditoria = auditoria;
		this.acoes = acoes;
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
		conferirRetirada(erros, requisicao.dataRetirada(), null);
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
				cliente.getId(), "dataRetirada", pedido.getDataRetirada().toString(), "valorTotal",
				dinheiro(pedido.getValorTotal()), "itens", itensDoPedido.size()));
		return consulta.detalhar(usuario, numero);
	}

	/**
	 * Edita um pedido Novo, Confirmado ou Em produção (ZAP-90). O item que continua com o mesmo
	 * produto mantém o preço congelado (RN10), mesmo que o produto tenha saído do cardápio; os
	 * itens novos entram com o preço atual. O cliente só pode ser trocado enquanto o pedido está
	 * Novo. Num pedido Confirmado, a mensagem de confirmação é atualizada.
	 */
	@Transactional
	public RespostaPedido editar(UsuarioAutenticado usuario, Integer numero, RequisicaoPedido requisicao) {
		OffsetDateTime agora = OffsetDateTime.now(ZoneOffset.UTC);
		Pedido pedido = pedidos.buscarParaAlterar(usuario.estabelecimentoId(), numero)
			.orElseThrow(PedidoNaoEncontradoException::new);
		pedido.exigirEditavel();
		List<ItemPedido> atuais = itens.buscarDosPedidos(List.of(pedido.getId()));
		Map<String, Object> antes = retrato(pedido, atuais);

		Map<String, String> erros = new LinkedHashMap<>();
		conferirRetirada(erros, requisicao.dataRetirada(), pedido.getDataRetirada());
		List<ItemDaRequisicao> itensDaRequisicao = requisicao.itens();
		List<ItemPedido> correspondentes = correspondentes(atuais, itensDaRequisicao);
		List<ItemDaRequisicao> novos = new ArrayList<>();
		for (int i = 0; i < itensDaRequisicao.size(); i++) {
			if (correspondentes.get(i) == null) {
				novos.add(itensDaRequisicao.get(i));
			}
		}
		Map<Long, Produto> doCardapio = produtosDoCardapio(usuario, novos);
		for (int i = 0; i < itensDaRequisicao.size(); i++) {
			ItemPedido existente = correspondentes.get(i);
			Produto produto = existente != null ? existente.getProduto()
					: doCardapio.get(itensDaRequisicao.get(i).produtoId());
			conferirItem(erros, i, itensDaRequisicao.get(i), produto);
		}
		if (!erros.isEmpty()) {
			throw new DadosInvalidosException(erros);
		}

		atualizarCliente(usuario, pedido, requisicao, agora);

		List<ItemPedido> itensDoPedido = new ArrayList<>();
		for (int i = 0; i < itensDaRequisicao.size(); i++) {
			ItemDaRequisicao itemDaRequisicao = itensDaRequisicao.get(i);
			ItemPedido existente = correspondentes.get(i);
			if (existente != null) {
				existente.atualizar(itemDaRequisicao.quantidade(), itemDaRequisicao.recheio(), itemDaRequisicao.cobertura(),
						itemDaRequisicao.observacao());
				itensDoPedido.add(existente);
			}
			else {
				itensDoPedido.add(itens.save(novoItem(pedido, doCardapio.get(itemDaRequisicao.produtoId()), itemDaRequisicao)));
			}
		}
		List<ItemPedido> retirados = atuais.stream().filter(item -> !itensDoPedido.contains(item)).toList();
		itens.deleteAll(retirados);
		pedido.alterar(requisicao.dataRetirada(), requisicao.observacao(), agora);
		pedido.atualizarTotal(total(itensDoPedido));
		pedidos.flush();

		Optional<MensagemWhatsapp> confirmacao = pedido.getStatus() == StatusPedido.CONFIRMADO
				? acoes.atualizarConfirmacao(pedido, itens.buscarDosPedidos(List.of(pedido.getId())))
				: Optional.empty();

		Map<String, Object> detalhes = new LinkedHashMap<>();
		detalhes.put("numero", numero);
		detalhes.put("status", pedido.getStatus().name());
		detalhes.put("antes", antes);
		detalhes.put("depois", retrato(pedido, itensDoPedido));
		confirmacao.ifPresent(mensagem -> detalhes.put("mensagemId", mensagem.getId()));
		registrar(usuario, AcaoAuditoria.PEDIDO_EDITADO, pedido, detalhes);
		return consulta.detalhar(usuario, numero);
	}

	/**
	 * Mesmo WhatsApp: é o mesmo cliente, e no pedido Novo o nome pode ser corrigido. Outro
	 * WhatsApp: troca o cliente, só no pedido Novo. Depois da confirmação, o nome que vier é
	 * ignorado, porque a mensagem já foi gerada para aquele cliente.
	 */
	private void atualizarCliente(UsuarioAutenticado usuario, Pedido pedido, RequisicaoPedido requisicao,
			OffsetDateTime agora) {
		Cliente atual = pedido.getCliente();
		if (requisicao.cliente().telefone().equals(atual.getTelefoneWhatsapp())) {
			if (pedido.getStatus() == StatusPedido.NOVO && !requisicao.cliente().nome().equals(atual.getNome())) {
				atual.renomear(requisicao.cliente().nome(), agora);
			}
			return;
		}
		pedido.exigirClienteTrocavel();
		pedido.trocarCliente(clienteDoWhatsapp(bloquearEstabelecimento(usuario), requisicao, agora), agora);
	}

	/**
	 * Para cada item pedido, o item atual com o mesmo produto, na ordem; {@code null} quando é
	 * um item novo. Dois itens com o mesmo produto casam com dois itens atuais, um cada.
	 */
	private static List<ItemPedido> correspondentes(List<ItemPedido> atuais, List<ItemDaRequisicao> itensDaRequisicao) {
		List<ItemPedido> livres = new ArrayList<>(atuais);
		List<ItemPedido> correspondentes = new ArrayList<>();
		for (ItemDaRequisicao itemDaRequisicao : itensDaRequisicao) {
			ItemPedido achado = livres.stream()
				.filter(item -> item.getProduto().getId().equals(itemDaRequisicao.produtoId()))
				.findFirst()
				.orElse(null);
			livres.remove(achado);
			correspondentes.add(achado);
		}
		return correspondentes;
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

	/**
	 * Retirada das 8h às 20h, de 30 em 30 minutos (RN23), e não antes de agora, no horário de
	 * São Paulo. Na edição, a data e hora que já estava no pedido pode ficar, mesmo que já tenha
	 * passado (ZAP-90).
	 */
	private static void conferirRetirada(Map<String, String> erros, LocalDateTime retirada, LocalDateTime atual) {
		if (retirada.equals(atual)) {
			return;
		}
		if (!horarioPermitido(retirada)) {
			erros.put("dataRetirada", HORARIO_FORA);
		}
		else if (retirada.isBefore(LocalDateTime.now(FUSO))) {
			erros.put("dataRetirada", DATA_PASSADA);
		}
	}

	/** Das 8h às 20h, em hora cheia ou meia hora, sem segundos (RN23). */
	static boolean horarioPermitido(LocalDateTime retirada) {
		LocalTime hora = retirada.toLocalTime();
		return !hora.isBefore(PRIMEIRA_RETIRADA) && !hora.isAfter(ULTIMA_RETIRADA) && hora.getMinute() % 30 == 0
				&& hora.getSecond() == 0 && hora.getNano() == 0;
	}

	/**
	 * O que mudou na edição, para o log. Sem nome nem telefone do cliente (LGPD): só o id.
	 */
	private static Map<String, Object> retrato(Pedido pedido, List<ItemPedido> itensDoPedido) {
		Map<String, Object> retrato = new LinkedHashMap<>();
		retrato.put("clienteId", pedido.getCliente().getId());
		retrato.put("dataRetirada", pedido.getDataRetirada().toString());
		retrato.put("valorTotal", dinheiro(pedido.getValorTotal()));
		retrato.put("itens", itensDoPedido.stream()
			.map(item -> Map.of("produtoId", item.getProduto().getId(), "quantidade",
					item.getQuantidade().stripTrailingZeros().toPlainString(), "precoUnitario",
					dinheiro(item.getPrecoUnitario())))
			.toList());
		return retrato;
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
