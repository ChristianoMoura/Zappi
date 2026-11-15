package br.com.zappi.produto;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import br.com.zappi.TestcontainersConfiguration;
import br.com.zappi.seguranca.ServicoToken;
import br.com.zappi.seguranca.UsuarioAutenticado;
import tools.jackson.databind.json.JsonMapper;

/**
 * Preço promocional (ZAP-152, ZAP-160): aplicar e encerrar a promoção na tela do produto, e a
 * edição comum do produto em promoção. Cada teste roda numa transação desfeita no fim; a Lídia
 * usa o cardápio da V2 (bolo de brigadeiro a R$ 100,00 e de ninho a R$ 115,00), e um segundo
 * estabelecimento confere o isolamento (RN01).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class PromocaoProdutoTests {

	private static final String ROTA = "/api/produtos";

	private static final String NAVEGADOR = "Navegador de teste";

	private static final String DESCONTO_NAO_MENOR = "O preço com desconto precisa ser menor que o preço antes da promoção.";

	private final JsonMapper json = JsonMapper.builder().build();

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private ServicoToken servicoToken;

	private String tokenDaLidia;

	private String tokenDeOutraLoja;

	private long casaBelt;

	private long ninho;

	@BeforeEach
	void preparaUsuarios() {
		Map<String, Object> dadosDaLidia = jdbc.queryForMap(
				"select id, estabelecimento_id from usuario where email = 'lidia@casabelt.com'");
		casaBelt = ((Number) dadosDaLidia.get("estabelecimento_id")).longValue();
		tokenDaLidia = servicoToken.gerar(
				new UsuarioAutenticado(((Number) dadosDaLidia.get("id")).longValue(), casaBelt));

		long outraLoja = jdbc.queryForObject("""
				insert into estabelecimento (nome, slug, telefone_whatsapp)
				values ('Doces da Ana', 'doces-da-ana-teste', '5511900000009') returning id
				""", Long.class);
		long ana = jdbc.queryForObject("""
				insert into usuario (estabelecimento_id, nome, email, senha_hash)
				values (?, 'Ana', 'ana@docesdaana.com', 'hash-de-teste') returning id
				""", Long.class, outraLoja);
		tokenDeOutraLoja = servicoToken.gerar(new UsuarioAutenticado(ana, outraLoja));

		ninho = idDoNome("Bolo de ninho com morango");
	}

	@Test
	void produtoSemPromocaoVemComPrecoPromocionalNulo() throws Exception {
		comToken(get(ROTA), tokenDaLidia)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].precoPromocional").value(nullValue()))
			.andExpect(jsonPath("$[0].precoPromocional").hasJsonPath());
		comToken(get(ROTA + "/" + ninho), tokenDaLidia)
			.andExpect(jsonPath("$.preco").value(115.00))
			.andExpect(jsonPath("$.precoPromocional").value(nullValue()));
	}

	@Test
	void aplicaAPromocaoERegistraOAntesEODepois() throws Exception {
		aplicar(ninho, "115", "99.9")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.id").value(ninho))
			.andExpect(jsonPath("$.preco").value(115.00))
			.andExpect(jsonPath("$.precoPromocional").value(99.90));

		assertThat(precos(ninho)).containsExactly(new BigDecimal("115.00"), new BigDecimal("99.90"));
		comToken(get(ROTA + "/" + ninho), tokenDaLidia).andExpect(jsonPath("$.precoPromocional").value(99.90));
		assertThat(logs(ninho)).containsExactly(Map.of("preco_antes", "115.00", "preco_depois", "115.00",
				"promocional_antes", "", "promocional_depois", "99.90"));
		assertThat(jdbc.queryForMap("""
				select usuario_id, ip_origem, user_agent from log_auditoria
				where acao = 'PRODUTO_EDITADO' and entidade = 'produto' and entidade_id = ?
				""", ninho)).containsEntry("ip_origem", "127.0.0.1").containsEntry("user_agent", NAVEGADOR);
	}

	@Test
	void oPrecoAntesDaPromocaoPassaASerOPrecoNormal() throws Exception {
		aplicar(ninho, "120", "99.90")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.preco").value(120.00))
			.andExpect(jsonPath("$.precoPromocional").value(99.90));

		assertThat(precos(ninho)).containsExactly(new BigDecimal("120.00"), new BigDecimal("99.90"));
		assertThat(logs(ninho)).containsExactly(Map.of("preco_antes", "115.00", "preco_depois", "120.00",
				"promocional_antes", "", "promocional_depois", "99.90"));
	}

	@Test
	void aplicarDeNovoTrocaOsDoisPrecos() throws Exception {
		aplicar(ninho, "115", "99.90").andExpect(status().isOk());

		aplicar(ninho, "110", "89.90")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.preco").value(110.00))
			.andExpect(jsonPath("$.precoPromocional").value(89.90));

		assertThat(logs(ninho)).hasSize(2)
			.last()
			.isEqualTo(Map.of("preco_antes", "115.00", "preco_depois", "110.00", "promocional_antes", "99.90",
					"promocional_depois", "89.90"));
	}

	@Test
	void recusaDescontoIgualOuMaiorQueOPrecoAntesSemGravarNada() throws Exception {
		for (String desconto : List.of("115", "115.01", "200")) {
			aplicar(ninho, "115", desconto)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.codigo").value("DADOS_INVALIDOS"))
				.andExpect(jsonPath("$.campos.precoPromocional").value(DESCONTO_NAO_MENOR));
		}
		// Nem o preço antes muda quando o desconto é recusado
		aplicar(ninho, "90", "95").andExpect(status().isBadRequest());

		assertThat(precos(ninho)).containsExactly(new BigDecimal("115.00"), null);
		assertThat(logs(ninho)).isEmpty();
	}

	@Test
	void recusaPrecosZeroNegativosOuVazios() throws Exception {
		aplicar(ninho, "115", "0")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.precoPromocional").value("O preço com desconto precisa ser maior que zero."));
		aplicar(ninho, "-1", "-2")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.preco").value("Informe um preço maior que zero."))
			.andExpect(jsonPath("$.campos.precoPromocional").value("O preço com desconto precisa ser maior que zero."));
		comToken(post(ROTA + "/" + ninho + "/promocao"), tokenDaLidia, Map.of())
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.preco").value("Escreva o preço antes da promoção. Ex.: 100,00."))
			.andExpect(jsonPath("$.campos.precoPromocional").value("Escreva o preço com desconto. Ex.: 80,00."));
		aplicar(ninho, "115", "99.999")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.precoPromocional").value("Use no máximo 2 casas decimais."));

		assertThat(precos(ninho)).containsExactly(new BigDecimal("115.00"), null);
		assertThat(logs(ninho)).isEmpty();
	}

	@Test
	void encerraAPromocaoEVoltaAoPrecoNormal() throws Exception {
		aplicar(ninho, "115", "99.90").andExpect(status().isOk());

		comToken(delete(ROTA + "/" + ninho + "/promocao"), tokenDaLidia)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.preco").value(115.00))
			.andExpect(jsonPath("$.precoPromocional").value(nullValue()));

		assertThat(precos(ninho)).containsExactly(new BigDecimal("115.00"), null);
		assertThat(logs(ninho)).hasSize(2)
			.last()
			.isEqualTo(Map.of("preco_antes", "115.00", "preco_depois", "115.00", "promocional_antes", "99.90",
					"promocional_depois", ""));
	}

	@Test
	void encerrarSemPromocaoNaoMudaNadaNemGravaLog() throws Exception {
		comToken(delete(ROTA + "/" + ninho + "/promocao"), tokenDaLidia)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.precoPromocional").value(nullValue()));

		assertThat(logs(ninho)).isEmpty();
	}

	@Test
	void editarOProdutoEmPromocaoMantemAPromocao() throws Exception {
		aplicar(ninho, "115", "99.90").andExpect(status().isOk());

		// O corpo da edição não muda a promoção, nem se mandar o campo (ZAP-160)
		Map<String, Object> corpo = produto("120");
		corpo.put("precoPromocional", 1);
		comToken(put(ROTA + "/" + ninho), tokenDaLidia, corpo)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.preco").value(120.00))
			.andExpect(jsonPath("$.precoPromocional").value(99.90));

		assertThat(precos(ninho)).containsExactly(new BigDecimal("120.00"), new BigDecimal("99.90"));
	}

	@Test
	void editarNaoBaixaOPrecoAteOComDesconto() throws Exception {
		aplicar(ninho, "115", "99.90").andExpect(status().isOk());

		for (String preco : List.of("99.90", "50")) {
			comToken(put(ROTA + "/" + ninho), tokenDaLidia, produto(preco))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.codigo").value("DADOS_INVALIDOS"))
				.andExpect(jsonPath("$.campos.preco").value("Com a promoção ativa, o preço precisa ser maior que o "
						+ "preço com desconto. Para baixar mais, encerre a promoção."));
		}

		assertThat(precos(ninho)).containsExactly(new BigDecimal("115.00"), new BigDecimal("99.90"));
		assertThat(logs(ninho)).hasSize(1);
	}

	@Test
	void semPromocaoAEdicaoComumBaixaOPrecoNormalmente() throws Exception {
		comToken(put(ROTA + "/" + ninho), tokenDaLidia, produto("50"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.preco").value(50.00))
			.andExpect(jsonPath("$.precoPromocional").value(nullValue()));
	}

	@Test
	void produtoForaDoCardapioTambemPodeTerPromocao() throws Exception {
		jdbc.update("update produto set no_cardapio = false where id = ?", ninho);

		aplicar(ninho, "115", "99.90")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.noCardapio").value(false))
			.andExpect(jsonPath("$.precoPromocional").value(99.90));
	}

	@Test
	void naoAplicaNemEncerraPromocaoDeOutraLojaOuDeProdutoExcluido() throws Exception {
		long brigadeiro = idDoNome("Bolo de brigadeiro de chocolate");
		jdbc.update("update produto set preco_promocional = 80 where id = ?", brigadeiro);
		jdbc.update("update produto set ativo = false where id = ?", ninho);

		aplicar(tokenDeOutraLoja, brigadeiro, "100", "50").andExpect(status().isNotFound());
		comToken(delete(ROTA + "/" + brigadeiro + "/promocao"), tokenDeOutraLoja).andExpect(status().isNotFound());
		aplicar(ninho, "115", "99.90").andExpect(status().isNotFound());
		comToken(delete(ROTA + "/" + ninho + "/promocao"), tokenDaLidia).andExpect(status().isNotFound());
		aplicar(Long.MAX_VALUE, "115", "99.90").andExpect(status().isNotFound());

		assertThat(precos(brigadeiro)).containsExactly(new BigDecimal("100.00"), new BigDecimal("80.00"));
		assertThat(precos(ninho)).containsExactly(new BigDecimal("115.00"), null);
	}

	@Test
	void exigeOToken() throws Exception {
		mockMvc.perform(post(ROTA + "/" + ninho + "/promocao").contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(Map.of("preco", 115, "precoPromocional", 99.9))))
			.andExpect(status().isUnauthorized());
		mockMvc.perform(delete(ROTA + "/" + ninho + "/promocao")).andExpect(status().isUnauthorized());
	}

	private ResultActions aplicar(long id, String preco, String precoPromocional) throws Exception {
		return aplicar(tokenDaLidia, id, preco, precoPromocional);
	}

	private ResultActions aplicar(String token, long id, String preco, String precoPromocional) throws Exception {
		return comToken(post(ROTA + "/" + id + "/promocao"), token,
				Map.of("preco", new BigDecimal(preco), "precoPromocional", new BigDecimal(precoPromocional)));
	}

	/** Corpo da edição comum do bolo de ninho, só com o preço trocado. */
	private Map<String, Object> produto(String preco) {
		Map<String, Object> dados = new LinkedHashMap<>();
		dados.put("nome", "Bolo de ninho com morango");
		dados.put("categoriaId", jdbc.queryForObject("select categoria_id from produto where id = ?", Long.class, ninho));
		dados.put("unidade", "KG");
		dados.put("preco", new BigDecimal(preco));
		dados.put("contemGluten", true);
		return dados;
	}

	private ResultActions comToken(MockHttpServletRequestBuilder requisicao, String token) throws Exception {
		return mockMvc.perform(requisicao.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
			.header(HttpHeaders.USER_AGENT, NAVEGADOR));
	}

	private ResultActions comToken(MockHttpServletRequestBuilder requisicao, String token, Map<String, ?> corpo)
			throws Exception {
		return mockMvc.perform(requisicao.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
			.header(HttpHeaders.USER_AGENT, NAVEGADOR)
			.contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(corpo)));
	}

	private long idDoNome(String nome) {
		return jdbc.queryForObject("select id from produto where estabelecimento_id = ? and nome = ?", Long.class,
				casaBelt, nome);
	}

	/** Preço normal e preço com desconto gravados no banco. */
	private List<BigDecimal> precos(long id) {
		return jdbc.queryForObject("select preco, preco_promocional from produto where id = ?",
				(linha, i) -> java.util.Arrays.asList(linha.getBigDecimal("preco"),
						linha.getBigDecimal("preco_promocional")),
				id);
	}

	/**
	 * Preço normal e com desconto, antes e depois, em cada {@code PRODUTO_EDITADO} do produto, na
	 * ordem. O com desconto nulo (sem promoção) vira texto vazio.
	 */
	private List<Map<String, String>> logs(long id) {
		return jdbc.query("""
				select detalhes -> 'antes' ->> 'preco' as preco_antes,
				       detalhes -> 'depois' ->> 'preco' as preco_depois,
				       coalesce(detalhes -> 'antes' ->> 'precoPromocional', '') as promocional_antes,
				       coalesce(detalhes -> 'depois' ->> 'precoPromocional', '') as promocional_depois
				from log_auditoria where acao = 'PRODUTO_EDITADO' and entidade = 'produto' and entidade_id = ?
				order by id
				""", (linha, i) -> {
			Map<String, String> campos = new HashMap<>();
			for (String campo : List.of("preco_antes", "preco_depois", "promocional_antes", "promocional_depois")) {
				campos.put(campo, linha.getString(campo));
			}
			return campos;
		}, id);
	}

}
