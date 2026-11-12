package br.com.zappi.produto;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
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
 * CRUD de produtos (ZAP-39). Cada teste roda numa transação desfeita no fim; a Lídia usa o
 * cardápio da V2, e um segundo estabelecimento confere o isolamento (RN01).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class ProdutoTests {

	private static final String ROTA = "/api/produtos";

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

	private long lidia;

	@BeforeEach
	void preparaUsuarios() {
		Map<String, Object> dadosDaLidia = jdbc.queryForMap(
				"select id, estabelecimento_id from usuario where email = 'lidia@casabelt.com'");
		lidia = ((Number) dadosDaLidia.get("id")).longValue();
		casaBelt = ((Number) dadosDaLidia.get("estabelecimento_id")).longValue();
		tokenDaLidia = servicoToken.gerar(new UsuarioAutenticado(lidia, casaBelt));

		long outraLoja = jdbc.queryForObject("""
				insert into estabelecimento (nome, slug, telefone_whatsapp)
				values ('Doces da Ana', 'doces-da-ana-teste', '5511900000009') returning id
				""", Long.class);
		long ana = jdbc.queryForObject("""
				insert into usuario (estabelecimento_id, nome, email, senha_hash)
				values (?, 'Ana', 'ana@docesdaana.com', 'hash-de-teste') returning id
				""", Long.class, outraLoja);
		tokenDeOutraLoja = servicoToken.gerar(new UsuarioAutenticado(ana, outraLoja));
	}

	@Test
	void listaOsProdutosAtivosDoEstabelecimentoPorNomeESabor() throws Exception {
		comToken(get(ROTA), tokenDaLidia)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(4))
			.andExpect(jsonPath("$[0].nome").value("Bolo"))
			.andExpect(jsonPath("$[0].sabor").value("Brigadeiro de chocolate"))
			.andExpect(jsonPath("$[0].unidade").value("KG"))
			.andExpect(jsonPath("$[0].preco").value(100.00))
			.andExpect(jsonPath("$[3].sabor").value("Coxinha por unidade"))
			.andExpect(jsonPath("$[3].unidade").value("UN"));
	}

	@Test
	void cadastraOProdutoERegistraNoLog() throws Exception {
		String corpo = comToken(post(ROTA), tokenDaLidia, produto("Bolo", "  Cenoura com chocolate ", "kg", "95.50"))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.sabor").value("Cenoura com chocolate"))
			.andExpect(jsonPath("$.unidade").value("KG"))
			.andExpect(jsonPath("$.preco").value(95.50))
			.andExpect(jsonPath("$.ativo").value(true))
			.andReturn().getResponse().getContentAsString();
		long id = ((Number) json.readValue(corpo, Map.class).get("id")).longValue();

		assertThat(jdbc.queryForObject("select estabelecimento_id from produto where id = ?", Long.class, id))
			.isEqualTo(casaBelt);
		assertThat(log("PRODUTO_CRIADO", id)).containsEntry("usuario_id", lidia)
			.containsEntry("estabelecimento_id", casaBelt)
			.containsEntry("sabor_depois", "Cenoura com chocolate");
		confereOrigemDoLog("PRODUTO_CRIADO", id);
	}

	@Test
	void respondeComOEnderecoDoProdutoCriado() throws Exception {
		comToken(post(ROTA), tokenDaLidia, produto("Bolo", "Prestígio", "KG", "110"))
			.andExpect(status().isCreated())
			.andExpect(header().string(HttpHeaders.LOCATION, org.hamcrest.Matchers.matchesPattern("/api/produtos/\\d+")));
	}

	@Test
	void editaOProdutoERegistraOAntesEODepois() throws Exception {
		long id = idDoSabor("Brigadeiro de chocolate");

		comToken(put(ROTA + "/" + id), tokenDaLidia, produto("Bolo", "Brigadeiro de chocolate", "KG", "105"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.preco").value(105));

		assertThat(log("PRODUTO_EDITADO", id)).containsEntry("preco_antes", "100.00")
			.containsEntry("preco_depois", "105.00");
		confereOrigemDoLog("PRODUTO_EDITADO", id);
		// O pedido #1 da V2 continua com o preço da época (RN10)
		assertThat(jdbc.queryForObject("select preco_unitario from item_pedido where produto_id = ?", BigDecimal.class,
				id)).isEqualByComparingTo("100.00");
	}

	@Test
	void excluiDeFormaLogicaEMantemOsPedidosAntigos() throws Exception {
		long id = idDoSabor("Brigadeiro de chocolate");

		comToken(delete(ROTA + "/" + id), tokenDaLidia).andExpect(status().isNoContent());

		assertThat(jdbc.queryForObject("select ativo from produto where id = ?", Boolean.class, id)).isFalse();
		// O pedido #1 da V2 continua com o item e o preço congelado (RN10, RN14)
		assertThat(jdbc.queryForObject("select preco_unitario from item_pedido where produto_id = ?", BigDecimal.class,
				id)).isEqualByComparingTo("100.00");
		comToken(get(ROTA), tokenDaLidia).andExpect(jsonPath("$.length()").value(3));
		comToken(get(ROTA + "/" + id), tokenDaLidia).andExpect(status().isNotFound());
		assertThat(log("PRODUTO_EXCLUIDO", id)).containsEntry("usuario_id", lidia);
		confereOrigemDoLog("PRODUTO_EXCLUIDO", id);
	}

	@Test
	void naoMostraNemAlteraProdutosDeOutroEstabelecimento() throws Exception {
		long id = idDoSabor("Brigadeiro de chocolate");

		comToken(get(ROTA), tokenDeOutraLoja).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
		comToken(get(ROTA + "/" + id), tokenDeOutraLoja)
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.codigo").value("PRODUTO_NAO_ENCONTRADO"));
		comToken(put(ROTA + "/" + id), tokenDeOutraLoja, produto("Bolo", "Invadido", "KG", "1"))
			.andExpect(status().isNotFound());
		comToken(delete(ROTA + "/" + id), tokenDeOutraLoja).andExpect(status().isNotFound());

		assertThat(jdbc.queryForObject("select sabor || ativo from produto where id = ?", String.class, id))
			.isEqualTo("Brigadeiro de chocolatetrue");
	}

	@Test
	void recusaCamposObrigatoriosVaziosComAMensagemDeCadaCampo() throws Exception {
		comToken(post(ROTA), tokenDaLidia, Map.of("nome", " ", "descricao", "x"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.codigo").value("DADOS_INVALIDOS"))
			.andExpect(jsonPath("$.campos.nome").value("Informe o nome."))
			.andExpect(jsonPath("$.campos.sabor").value("Informe o sabor."))
			.andExpect(jsonPath("$.campos.unidade").value("Escolha a unidade: KG ou UN."))
			.andExpect(jsonPath("$.campos.preco").value("Informe o preço."));
	}

	@Test
	void recusaPrecoZeroOuNegativo() throws Exception {
		for (String preco : List.of("0", "-10")) {
			comToken(post(ROTA), tokenDaLidia, produto("Bolo", "Teste", "KG", preco))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.campos.preco").value("Informe um preço maior que zero."));
		}
	}

	@Test
	void recusaPrecoComMaisDeDuasCasasEUnidadeDesconhecida() throws Exception {
		comToken(post(ROTA), tokenDaLidia, produto("Bolo", "Teste", "LITRO", "10.555"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.preco").value("Use no máximo 2 casas decimais."))
			.andExpect(jsonPath("$.campos.unidade").value("Escolha a unidade: KG ou UN."));
	}

	@Test
	void recusaTextosMaioresQueAColuna() throws Exception {
		comToken(post(ROTA), tokenDaLidia, produto("B".repeat(101), "Teste", "KG", "10"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.nome").value("Use até 100 caracteres."));
	}

	@Test
	void recusaApagarOTextoAlternativoDeProdutoComFoto() throws Exception {
		long id = idDoSabor("Ninho com morango");
		jdbc.update("update produto set foto_caminho = ?, foto_texto_alternativo = ? where id = ?",
				casaBelt + "/ninho.jpg", "Bolo branco com morangos", id);

		comToken(put(ROTA + "/" + id), tokenDaLidia, produto("Bolo", "Ninho com morango", "KG", "115"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.textoAlternativo").value("Descreva a foto para quem não consegue vê-la."));

		Map<String, Object> comTexto = produto("Bolo", "Ninho com morango", "KG", "115");
		comTexto.put("textoAlternativo", "Bolo branco de leite Ninho com morangos");
		comToken(put(ROTA + "/" + id), tokenDaLidia, comTexto)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.textoAlternativo").value("Bolo branco de leite Ninho com morangos"));
	}

	@Test
	void cadastraComGlutenEOutrosAlergenos() throws Exception {
		Map<String, Object> dados = produto("Bolo", "Ninho sem farinha", "KG", "120");
		dados.put("contemGluten", false);
		dados.put("outrosAlergenos", "  leite, ovos  ");

		String corpo = comToken(post(ROTA), tokenDaLidia, dados)
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.contemGluten").value(false))
			.andExpect(jsonPath("$.outrosAlergenos").value("leite, ovos"))
			.andReturn().getResponse().getContentAsString();
		long id = ((Number) json.readValue(corpo, Map.class).get("id")).longValue();

		assertThat(jdbc.queryForMap("select contem_gluten, outros_alergenos from produto where id = ?", id))
			.containsEntry("contem_gluten", false)
			.containsEntry("outros_alergenos", "leite, ovos");
		assertThat(jdbc.queryForObject("select (detalhes -> 'depois' -> 'contemGluten')::text from log_auditoria "
				+ "where acao = 'PRODUTO_CRIADO' and entidade_id = ?", String.class, id)).isEqualTo("false");
	}

	@Test
	void guardaOutrosAlergenosVaziosComoNulo() throws Exception {
		Map<String, Object> dados = produto("Bolo", "Sem alérgenos extras", "KG", "90");
		dados.put("outrosAlergenos", "   ");

		comToken(post(ROTA), tokenDaLidia, dados)
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.outrosAlergenos").value(org.hamcrest.Matchers.nullValue()));
	}

	@Test
	void recusaProdutoSemInformarOGluten() throws Exception {
		Map<String, Object> dados = produto("Bolo", "Sem resposta", "KG", "90");
		dados.remove("contemGluten");

		comToken(post(ROTA), tokenDaLidia, dados)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.codigo").value("DADOS_INVALIDOS"))
			.andExpect(jsonPath("$.campos.contemGluten").value("Informe se o produto contém glúten."));
		comToken(put(ROTA + "/" + idDoSabor("Brigadeiro de chocolate")), tokenDaLidia, dados)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.contemGluten").value("Informe se o produto contém glúten."));
	}

	@Test
	void recusaOutrosAlergenosComMaisDe300Caracteres() throws Exception {
		Map<String, Object> dados = produto("Bolo", "Texto longo", "KG", "90");
		dados.put("outrosAlergenos", "a".repeat(301));
		comToken(post(ROTA), tokenDaLidia, dados)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.outrosAlergenos").value("Use até 300 caracteres."));

		dados.put("outrosAlergenos", "a".repeat(300));
		comToken(post(ROTA), tokenDaLidia, dados).andExpect(status().isCreated());
	}

	@Test
	void produtoAntigoContinuaComGlutenNaoInformadoEORegistraOAntesNaEdicao() throws Exception {
		long id = idDoSabor("Brigadeiro de chocolate");

		// Nulo, e nunca false: o sistema não diz "sem glúten" sem a Lídia ter informado
		comToken(get(ROTA + "/" + id), tokenDaLidia)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.contemGluten").value(org.hamcrest.Matchers.nullValue()))
			.andExpect(jsonPath("$.outrosAlergenos").value(org.hamcrest.Matchers.nullValue()));

		Map<String, Object> dados = produto("Bolo", "Brigadeiro de chocolate", "KG", "100");
		dados.put("contemGluten", true);
		dados.put("outrosAlergenos", "leite");
		comToken(put(ROTA + "/" + id), tokenDaLidia, dados)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.contemGluten").value(true));

		Map<String, Object> registro = jdbc.queryForMap("""
				select (detalhes -> 'antes' -> 'contemGluten')::text as gluten_antes,
				       (detalhes -> 'depois' -> 'contemGluten')::text as gluten_depois,
				       detalhes -> 'depois' ->> 'outrosAlergenos' as alergenos_depois
				from log_auditoria where acao = 'PRODUTO_EDITADO' and entidade = 'produto' and entidade_id = ?
				""", id);
		assertThat(registro).containsEntry("gluten_antes", "null")
			.containsEntry("gluten_depois", "true")
			.containsEntry("alergenos_depois", "leite");
	}

	@Test
	void exigeOToken() throws Exception {
		mockMvc.perform(get(ROTA)).andExpect(status().isUnauthorized());
		mockMvc.perform(post(ROTA).contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(produto("Bolo", "Teste", "KG", "10"))))
			.andExpect(status().isUnauthorized());
	}

	private static final String NAVEGADOR = "Navegador de teste";

	private static Map<String, Object> produto(String nome, String sabor, String unidade, String preco) {
		Map<String, Object> dados = new LinkedHashMap<>();
		dados.put("nome", nome);
		dados.put("sabor", sabor);
		dados.put("unidade", unidade);
		dados.put("preco", new BigDecimal(preco));
		dados.put("descricao", "Descrição de teste");
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

	private long idDoSabor(String sabor) {
		return jdbc.queryForObject("select id from produto where estabelecimento_id = ? and sabor = ?", Long.class,
				casaBelt, sabor);
	}

	private void confereOrigemDoLog(String acao, long produtoId) {
		assertThat(log(acao, produtoId)).containsEntry("ip_origem", "127.0.0.1")
			.containsEntry("user_agent", NAVEGADOR)
			.extractingByKey("criado_em").isNotNull();
	}

	private Map<String, Object> log(String acao, long produtoId) {
		return jdbc.queryForMap("""
				select usuario_id, estabelecimento_id, ip_origem, user_agent, criado_em,
				       detalhes -> 'depois' ->> 'sabor' as sabor_depois,
				       detalhes -> 'antes' ->> 'preco' as preco_antes,
				       detalhes -> 'depois' ->> 'preco' as preco_depois
				from log_auditoria where acao = ? and entidade = 'produto' and entidade_id = ?
				""", acao, produtoId);
	}

}
