package br.com.zappi.produto;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.zappi.auditoria.AcaoAuditoria;
import br.com.zappi.auditoria.RegistroAuditoria;
import br.com.zappi.auditoria.ServicoAuditoria;
import br.com.zappi.estabelecimento.Estabelecimento;
import br.com.zappi.seguranca.UsuarioAutenticado;
import jakarta.persistence.EntityManager;

/**
 * Cadastro de produtos do cardápio (RF05, RF06). Tudo é feito no estabelecimento da
 * usuária logada, vindo do token, nunca da requisição (RN01, ISO 27002 5.34). Cada
 * alteração vai para o log de auditoria na mesma transação (ISO 27002 8.16).
 */
@Service
public class ServicoProduto {

	private static final String ENTIDADE = "produto";

	private final ProdutoRepositorio produtos;

	private final UnidadeMedidaRepositorio unidades;

	private final ServicoAuditoria auditoria;

	private final EntityManager entityManager;

	public ServicoProduto(ProdutoRepositorio produtos, UnidadeMedidaRepositorio unidades, ServicoAuditoria auditoria,
			EntityManager entityManager) {
		this.produtos = produtos;
		this.unidades = unidades;
		this.auditoria = auditoria;
		this.entityManager = entityManager;
	}

	/** Só os ativos (RN14), por nome e sabor. */
	@Transactional(readOnly = true)
	public List<RespostaProduto> listar(UsuarioAutenticado usuario) {
		return produtos.findByEstabelecimentoIdAndAtivoTrueOrderByNomeAscSaborAscIdAsc(usuario.estabelecimentoId())
			.stream()
			.map(RespostaProduto::de)
			.toList();
	}

	@Transactional(readOnly = true)
	public RespostaProduto buscar(UsuarioAutenticado usuario, Long id) {
		return RespostaProduto.de(encontrar(usuario, id));
	}

	@Transactional
	public RespostaProduto criar(UsuarioAutenticado usuario, RequisicaoProduto dados) {
		Produto produto = new Produto(entityManager.getReference(Estabelecimento.class, usuario.estabelecimentoId()),
				unidade(dados), dados.nome(), dados.sabor(), dados.descricao(), preco(dados), dados.textoAlternativo(),
				agora());
		produtos.saveAndFlush(produto);

		registrar(usuario, AcaoAuditoria.PRODUTO_CRIADO, produto, Map.of("depois", retrato(produto)));
		return RespostaProduto.de(produto);
	}

	@Transactional
	public RespostaProduto editar(UsuarioAutenticado usuario, Long id, RequisicaoProduto dados) {
		Produto produto = encontrar(usuario, id);
		if (produto.temFoto() && dados.textoAlternativo() == null) {
			throw new FotoSemTextoAlternativoException();
		}
		Map<String, Object> antes = retrato(produto);

		produto.atualizar(unidade(dados), dados.nome(), dados.sabor(), dados.descricao(), preco(dados),
				dados.textoAlternativo(), agora());
		produtos.flush();

		registrar(usuario, AcaoAuditoria.PRODUTO_EDITADO, produto, Map.of("antes", antes, "depois", retrato(produto)));
		return RespostaProduto.de(produto);
	}

	/** Exclusão lógica (RN14): o produto continua nos pedidos antigos, com o preço congelado. */
	@Transactional
	public void excluir(UsuarioAutenticado usuario, Long id) {
		Produto produto = encontrar(usuario, id);
		produto.excluir(agora());
		produtos.flush();

		registrar(usuario, AcaoAuditoria.PRODUTO_EXCLUIDO, produto, Map.of("antes", retrato(produto)));
	}

	private Produto encontrar(UsuarioAutenticado usuario, Long id) {
		return produtos.findByIdAndEstabelecimentoIdAndAtivoTrue(id, usuario.estabelecimentoId())
			.orElseThrow(ProdutoNaoEncontradoException::new);
	}

	/** Sempre com 2 casas; a validação já garante que não há mais que isso. */
	private static BigDecimal preco(RequisicaoProduto dados) {
		return dados.preco().setScale(2, RoundingMode.UNNECESSARY);
	}

	private UnidadeMedida unidade(RequisicaoProduto dados) {
		// A validação da requisição já garante KG ou UN, que existem desde a V1.
		return unidades.findBySigla(dados.unidade()).orElseThrow();
	}

	private void registrar(UsuarioAutenticado usuario, AcaoAuditoria acao, Produto produto,
			Map<String, ?> detalhes) {
		auditoria.registrar(RegistroAuditoria.de(acao)
			.estabelecimento(usuario.estabelecimentoId())
			.usuario(usuario.usuarioId())
			.entidade(ENTIDADE, produto.getId())
			.detalhes(detalhes));
	}

	/** Os campos que a Lídia edita, para o log mostrar o antes e o depois. */
	private static Map<String, Object> retrato(Produto produto) {
		Map<String, Object> campos = new LinkedHashMap<>();
		campos.put("nome", produto.getNome());
		campos.put("sabor", produto.getSabor());
		campos.put("unidade", produto.getUnidadeMedida().getSigla());
		// Texto com 2 casas, para o log mostrar sempre o mesmo formato (ex.: "100.00")
		campos.put("preco", produto.getPreco().setScale(2, RoundingMode.UNNECESSARY).toPlainString());
		campos.put("descricao", produto.getDescricao());
		campos.put("textoAlternativo", produto.getFotoTextoAlternativo());
		campos.put("ativo", produto.isAtivo());
		return campos;
	}

	private static OffsetDateTime agora() {
		return OffsetDateTime.now(ZoneOffset.UTC);
	}

}
