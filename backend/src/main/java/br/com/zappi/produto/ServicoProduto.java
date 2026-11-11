package br.com.zappi.produto;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import br.com.zappi.armazenamento.ArmazenamentoDeFotos;
import br.com.zappi.armazenamento.ArmazenamentoIndisponivelException;
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

	private final ArmazenamentoDeFotos armazenamento;

	public ServicoProduto(ProdutoRepositorio produtos, UnidadeMedidaRepositorio unidades, ServicoAuditoria auditoria,
			EntityManager entityManager, ArmazenamentoDeFotos armazenamento) {
		this.produtos = produtos;
		this.unidades = unidades;
		this.auditoria = auditoria;
		this.entityManager = entityManager;
		this.armazenamento = armazenamento;
	}

	/** Só os ativos (RN14), por nome e sabor. */
	@Transactional(readOnly = true)
	public List<RespostaProduto> listar(UsuarioAutenticado usuario) {
		return produtos.findByEstabelecimentoIdAndAtivoTrueOrderByNomeAscSaborAscIdAsc(usuario.estabelecimentoId())
			.stream()
			.map(this::resposta)
			.toList();
	}

	@Transactional(readOnly = true)
	public RespostaProduto buscar(UsuarioAutenticado usuario, Long id) {
		return resposta(encontrar(usuario, id));
	}

	@Transactional
	public RespostaProduto criar(UsuarioAutenticado usuario, RequisicaoProduto dados) {
		Produto produto = new Produto(entityManager.getReference(Estabelecimento.class, usuario.estabelecimentoId()),
				unidade(dados), dados.nome(), dados.sabor(), dados.descricao(), preco(dados), dados.textoAlternativo(),
				dados.contemGluten(), dados.outrosAlergenos(), agora());
		produtos.saveAndFlush(produto);

		registrar(usuario, AcaoAuditoria.PRODUTO_CRIADO, produto, Map.of("depois", retrato(produto)));
		return resposta(produto);
	}

	@Transactional
	public RespostaProduto editar(UsuarioAutenticado usuario, Long id, RequisicaoProduto dados) {
		Produto produto = encontrar(usuario, id);
		if (produto.temFoto() && dados.textoAlternativo() == null) {
			throw new FotoSemTextoAlternativoException();
		}
		Map<String, Object> antes = retrato(produto);

		produto.atualizar(unidade(dados), dados.nome(), dados.sabor(), dados.descricao(), preco(dados),
				dados.textoAlternativo(), dados.contemGluten(), dados.outrosAlergenos(), agora());
		produtos.flush();

		registrar(usuario, AcaoAuditoria.PRODUTO_EDITADO, produto, Map.of("antes", antes, "depois", retrato(produto)));
		return resposta(produto);
	}

	/** Exclusão lógica (RN14): o produto continua nos pedidos antigos, com o preço congelado. */
	@Transactional
	public void excluir(UsuarioAutenticado usuario, Long id) {
		Produto produto = encontrar(usuario, id);
		produto.excluir(agora());
		produtos.flush();

		registrar(usuario, AcaoAuditoria.PRODUTO_EXCLUIDO, produto, Map.of("antes", retrato(produto)));
	}

	/**
	 * Envia a foto para o Storage e troca a do produto (ZAP-40, RN15). O nome do arquivo é
	 * novo a cada envio, para o navegador não mostrar a foto antiga guardada. A antiga só é
	 * apagada depois que o banco confirmar a troca; se a troca falhar, a nova é apagada.
	 */
	@Transactional
	public RespostaProduto enviarFoto(UsuarioAutenticado usuario, Long id, FotoRecebida foto) {
		if (!armazenamento.disponivel()) {
			throw new ArmazenamentoIndisponivelException("Storage não configurado", null);
		}
		Produto produto = encontrar(usuario, id);
		Map<String, Object> antes = retrato(produto);
		String fotoAntiga = produto.getFotoCaminho();

		String caminho = usuario.estabelecimentoId() + "/" + produto.getId() + "-"
				+ UUID.randomUUID().toString().substring(0, 8) + "." + foto.tipo().extensao();
		armazenamento.enviar(caminho, foto.conteudo(), foto.tipo().mime());
		depoisDaTransacao(caminho, fotoAntiga);

		produto.trocarFoto(caminho, foto.textoAlternativo(), agora());
		produtos.flush();
		registrar(usuario, AcaoAuditoria.PRODUTO_EDITADO, produto, Map.of("antes", antes, "depois", retrato(produto)));
		return resposta(produto);
	}

	/** Tira a foto do produto e apaga o arquivo do Storage depois da confirmação. */
	@Transactional
	public RespostaProduto removerFoto(UsuarioAutenticado usuario, Long id) {
		Produto produto = encontrar(usuario, id);
		String fotoAntiga = produto.getFotoCaminho();
		if (fotoAntiga == null) {
			return resposta(produto);
		}
		Map<String, Object> antes = retrato(produto);

		produto.removerFoto(agora());
		produtos.flush();
		depoisDaTransacao(null, fotoAntiga);
		registrar(usuario, AcaoAuditoria.PRODUTO_EDITADO, produto, Map.of("antes", antes, "depois", retrato(produto)));
		return resposta(produto);
	}

	/**
	 * Confirmada a transação, apaga a foto que saiu; desfeita, apaga a que acabou de ser
	 * enviada, para não sobrar arquivo sem produto.
	 */
	private void depoisDaTransacao(String fotoNova, String fotoQueSai) {
		TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
			@Override
			public void afterCompletion(int status) {
				if (status == STATUS_COMMITTED) {
					armazenamento.apagar(fotoQueSai);
				}
				else {
					armazenamento.apagar(fotoNova);
				}
			}
		});
	}

	private RespostaProduto resposta(Produto produto) {
		return RespostaProduto.de(produto, armazenamento);
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
		campos.put("foto", produto.getFotoCaminho());
		campos.put("textoAlternativo", produto.getFotoTextoAlternativo());
		// Nulo no log também quer dizer "não informado"
		campos.put("contemGluten", produto.getContemGluten());
		campos.put("outrosAlergenos", produto.getOutrosAlergenos());
		campos.put("ativo", produto.isAtivo());
		return campos;
	}

	private static OffsetDateTime agora() {
		return OffsetDateTime.now(ZoneOffset.UTC);
	}

}
