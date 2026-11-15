package br.com.zappi.categoria;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.zappi.auditoria.AcaoAuditoria;
import br.com.zappi.auditoria.RegistroAuditoria;
import br.com.zappi.auditoria.ServicoAuditoria;
import br.com.zappi.erro.DadosInvalidosException;
import br.com.zappi.estabelecimento.Estabelecimento;
import br.com.zappi.estabelecimento.EstabelecimentoNaoEncontradoException;
import br.com.zappi.estabelecimento.EstabelecimentoRepositorio;
import br.com.zappi.produto.ProdutoRepositorio;
import br.com.zappi.seguranca.UsuarioAutenticado;

/**
 * Cadastro das categorias do cardápio (ZAP-136, ZAP-138). Tudo é feito no estabelecimento da
 * usuária logada, vindo do token (RN01, ISO 27002 5.34), e cada alteração vai para o log na
 * mesma transação (ISO 27002 8.16).
 *
 * <p>Criar, renomear e reordenar bloqueiam a linha do estabelecimento, como na numeração dos
 * pedidos (RN09): duas gravações ao mesmo tempo ficam uma depois da outra, sem repetir o nome
 * nem a posição.
 */
@Service
public class ServicoCategoria {

	private static final String ENTIDADE = "categoria";

	private final CategoriaRepositorio categorias;

	private final ProdutoRepositorio produtos;

	private final EstabelecimentoRepositorio estabelecimentos;

	private final ServicoAuditoria auditoria;

	public ServicoCategoria(CategoriaRepositorio categorias, ProdutoRepositorio produtos,
			EstabelecimentoRepositorio estabelecimentos, ServicoAuditoria auditoria) {
		this.categorias = categorias;
		this.produtos = produtos;
		this.estabelecimentos = estabelecimentos;
		this.auditoria = auditoria;
	}

	/** As ativas, na ordem da Lídia. */
	@Transactional(readOnly = true)
	public List<RespostaCategoria> listar(UsuarioAutenticado usuario) {
		return ativas(usuario.estabelecimentoId()).stream().map(RespostaCategoria::de).toList();
	}

	/** Categoria nova entra no fim da lista. */
	@Transactional
	public RespostaCategoria criar(UsuarioAutenticado usuario, RequisicaoCategoria dados) {
		Estabelecimento estabelecimento = bloquearEstabelecimento(usuario);
		exigirNomeLivre(usuario, dados.nome(), null);
		Categoria categoria = new Categoria(estabelecimento, dados.nome(),
				categorias.ultimaOrdem(estabelecimento.getId()) + 1, agora());
		categorias.saveAndFlush(categoria);

		registrar(usuario, AcaoAuditoria.CATEGORIA_CRIADA, categoria.getId(), Map.of("depois", retrato(categoria)));
		return RespostaCategoria.de(categoria);
	}

	@Transactional
	public RespostaCategoria renomear(UsuarioAutenticado usuario, Long id, RequisicaoCategoria dados) {
		bloquearEstabelecimento(usuario);
		Categoria categoria = encontrar(usuario, id);
		exigirNomeLivre(usuario, dados.nome(), id);
		Map<String, Object> antes = retrato(categoria);

		categoria.renomear(dados.nome(), agora());
		categorias.flush();

		registrar(usuario, AcaoAuditoria.CATEGORIA_EDITADA, id, Map.of("antes", antes, "depois", retrato(categoria)));
		return RespostaCategoria.de(categoria);
	}

	/**
	 * Grava a ordem nova de uma vez. A lista precisa ter todas as categorias ativas da loja, sem
	 * repetir e sem id de outra loja; senão, nada muda e a resposta é 400. A ordem passa a ser
	 * 1, 2, 3... na ordem recebida, e o log guarda os ids antes e depois.
	 */
	@Transactional
	public List<RespostaCategoria> reordenar(UsuarioAutenticado usuario, RequisicaoOrdemCategorias dados) {
		bloquearEstabelecimento(usuario);
		List<Categoria> atuais = ativas(usuario.estabelecimentoId());
		List<Long> ids = dados.ids();
		Set<Long> idsAtuais = atuais.stream().map(Categoria::getId).collect(Collectors.toSet());
		if (ids.size() != atuais.size() || new HashSet<>(ids).size() != ids.size() || !idsAtuais.containsAll(ids)) {
			throw new DadosInvalidosException(Map.of("ids", RequisicaoOrdemCategorias.LISTA_INVALIDA));
		}

		List<Long> antes = atuais.stream().map(Categoria::getId).toList();
		Map<Long, Categoria> porId = atuais.stream().collect(Collectors.toMap(Categoria::getId, Function.identity()));
		OffsetDateTime agora = agora();
		for (int i = 0; i < ids.size(); i++) {
			porId.get(ids.get(i)).mudarOrdem(i + 1, agora);
		}
		categorias.flush();

		if (!antes.equals(ids)) {
			registrar(usuario, AcaoAuditoria.CATEGORIA_EDITADA, null,
					Map.of("antes", Map.of("ordem", antes), "depois", Map.of("ordem", ids)));
		}
		return ids.stream().map(porId::get).map(RespostaCategoria::de).toList();
	}

	/**
	 * Exclusão lógica (RN14), só sem produto não excluído na categoria. Os produtos já
	 * excluídos continuam ligados a ela, para o histórico.
	 */
	@Transactional
	public void excluir(UsuarioAutenticado usuario, Long id) {
		Categoria categoria = encontrar(usuario, id);
		if (produtos.existsByCategoriaIdAndAtivoTrue(id)) {
			throw new CategoriaComProdutoException();
		}
		Map<String, Object> antes = retrato(categoria);
		categoria.excluir(agora());
		categorias.flush();

		registrar(usuario, AcaoAuditoria.CATEGORIA_EXCLUIDA, id, Map.of("antes", antes));
	}

	private List<Categoria> ativas(Long estabelecimentoId) {
		return categorias.findByEstabelecimentoIdAndAtivoTrueOrderByOrdemAscIdAsc(estabelecimentoId);
	}

	private Categoria encontrar(UsuarioAutenticado usuario, Long id) {
		return categorias.findByIdAndEstabelecimentoIdAndAtivoTrue(id, usuario.estabelecimentoId())
			.orElseThrow(CategoriaNaoEncontradaException::new);
	}

	private void exigirNomeLivre(UsuarioAutenticado usuario, String nome, Long idIgnorado) {
		if (categorias.nomeEmUso(usuario.estabelecimentoId(), nome, idIgnorado)) {
			throw new NomeDeCategoriaEmUsoException();
		}
	}

	private Estabelecimento bloquearEstabelecimento(UsuarioAutenticado usuario) {
		return estabelecimentos.buscarParaNumerarPedido(usuario.estabelecimentoId())
			.orElseThrow(EstabelecimentoNaoEncontradoException::new);
	}

	private void registrar(UsuarioAutenticado usuario, AcaoAuditoria acao, Long id, Map<String, ?> detalhes) {
		auditoria.registrar(RegistroAuditoria.de(acao)
			.estabelecimento(usuario.estabelecimentoId())
			.usuario(usuario.usuarioId())
			.entidade(ENTIDADE, id)
			.detalhes(detalhes));
	}

	/** Os campos que a Lídia muda, para o log mostrar o antes e o depois. */
	private static Map<String, Object> retrato(Categoria categoria) {
		Map<String, Object> campos = new LinkedHashMap<>();
		campos.put("nome", categoria.getNome());
		campos.put("ordem", categoria.getOrdem());
		campos.put("ativo", categoria.isAtivo());
		return campos;
	}

	private static OffsetDateTime agora() {
		return OffsetDateTime.now(ZoneOffset.UTC);
	}

}
