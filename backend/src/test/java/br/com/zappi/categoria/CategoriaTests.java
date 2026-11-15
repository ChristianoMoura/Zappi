package br.com.zappi.categoria;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
 * Categorias do cardápio (ZAP-136, ZAP-138). A Casa Belt começa com "Bolos" e "Salgados", criadas
 * pela migração a partir dos produtos da V2 (ZAP-137); um segundo estabelecimento confere o
 * isolamento (RN01). Cada teste roda numa transação desfeita no fim.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class CategoriaTests {

	private static final String ROTA = "/api/categorias";

	private static final String LISTA_INVALIDA = "A lista precisa ter todas as categorias da loja, cada uma uma vez.";

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

	private long outraLoja;

	private long lidia;

	private long bolos;

	private long salgados;

	@BeforeEach
	void preparaUsuarios() {
		Map<String, Object> dadosDaLidia = jdbc.queryForMap(
				"select id, estabelecimento_id from usuario where email = 'lidia@casabelt.com'");
		lidia = ((Number) dadosDaLidia.get("id")).longValue();
		casaBelt = ((Number) dadosDaLidia.get("estabelecimento_id")).longValue();
		tokenDaLidia = servicoToken.gerar(new UsuarioAutenticado(lidia, casaBelt));

		outraLoja = jdbc.queryForObject("""
				insert into estabelecimento (nome, slug, telefone_whatsapp)
				values ('Doces da Ana', 'doces-da-ana-categorias', '5511900000009') returning id
				""", Long.class);
		long ana = jdbc.queryForObject("""
				insert into usuario (estabelecimento_id, nome, email, senha_hash)
				values (?, 'Ana', 'ana@docesdaana.com', 'hash-de-teste') returning id
				""", Long.class, outraLoja);
		tokenDeOutraLoja = servicoToken.gerar(new UsuarioAutenticado(ana, outraLoja));

		bolos = idDaCategoria("Bolos");
		salgados = idDaCategoria("Salgados");
	}

	@Test
	void listaAsCategoriasNaOrdemDaLidia() throws Exception {
		comToken(get(ROTA), tokenDaLidia)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[*].nome", contains("Bolos", "Salgados")))
			.andExpect(jsonPath("$[0].id").value(bolos))
			.andExpect(jsonPath("$[0].ordem").doesNotExist());
		comToken(get(ROTA), tokenDeOutraLoja).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
	}

	@Test
	void criaNoFimDaListaERegistraNoLog() throws Exception {
		String corpo = comToken(post(ROTA), tokenDaLidia, Map.of("nome", "  Doces finos  "))
			.andExpect(status().isCreated())
			.andExpect(header().string(HttpHeaders.LOCATION, org.hamcrest.Matchers.matchesPattern("/api/categorias/\\d+")))
			.andExpect(jsonPath("$.nome").value("Doces finos"))
			.andReturn().getResponse().getContentAsString();
		long id = ((Number) json.readValue(corpo, Map.class).get("id")).longValue();

		comToken(get(ROTA), tokenDaLidia).andExpect(jsonPath("$[*].nome", contains("Bolos", "Salgados", "Doces finos")));
		assertThat(jdbc.queryForMap("select estabelecimento_id, ordem from categoria where id = ?", id))
			.containsEntry("estabelecimento_id", casaBelt)
			.containsEntry("ordem", 3);
		assertThat(log("CATEGORIA_CRIADA", id)).containsEntry("usuario_id", lidia)
			.containsEntry("estabelecimento_id", casaBelt)
			.containsEntry("nome_depois", "Doces finos")
			.containsEntry("ip_origem", "127.0.0.1");
	}

	@Test
	void recusaNomeVazioOuLongo() throws Exception {
		comToken(post(ROTA), tokenDaLidia, Map.of("nome", "   "))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.codigo").value("DADOS_INVALIDOS"))
			.andExpect(jsonPath("$.campos.nome").value("Escreva o nome da categoria."));
		comToken(post(ROTA), tokenDaLidia, Map.of("nome", "x".repeat(61)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.nome").value("Use até 60 caracteres."));
		comToken(put(ROTA + "/" + bolos), tokenDaLidia, Map.of("nome", ""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.nome").value("Escreva o nome da categoria."));

		comToken(post(ROTA), tokenDaLidia, Map.of("nome", "x".repeat(60))).andExpect(status().isCreated());
	}

	@Test
	void recusaNomeRepetidoNaLojaSemDiferenciarMaiusculas() throws Exception {
		comToken(post(ROTA), tokenDaLidia, Map.of("nome", " bOLOS "))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.codigo").value("CATEGORIA_NOME_EM_USO"))
			.andExpect(jsonPath("$.mensagem").value("Já existe uma categoria com esse nome. Escolha outro."))
			.andExpect(jsonPath("$.campos.nome").value("Já existe uma categoria com esse nome. Escolha outro."));
		comToken(put(ROTA + "/" + salgados), tokenDaLidia, Map.of("nome", "Bolos"))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.codigo").value("CATEGORIA_NOME_EM_USO"));

		// Outra loja pode usar o mesmo nome (RN01)
		comToken(post(ROTA), tokenDeOutraLoja, Map.of("nome", "Bolos")).andExpect(status().isCreated());
		assertThat(jdbc.queryForObject("select count(*) from categoria where estabelecimento_id = ?", Integer.class,
				casaBelt)).isEqualTo(2);
	}

	@Test
	void nomeDeCategoriaExcluidaPodeSerUsadoDeNovo() throws Exception {
		long tortas = criarCategoria("Tortas", 3);
		comToken(delete(ROTA + "/" + tortas), tokenDaLidia).andExpect(status().isNoContent());

		comToken(post(ROTA), tokenDaLidia, Map.of("nome", "Tortas")).andExpect(status().isCreated());
	}

	@Test
	void renomeiaERegistraOAntesEODepois() throws Exception {
		comToken(put(ROTA + "/" + bolos), tokenDaLidia, Map.of("nome", " Bolos caseiros "))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.id").value(bolos))
			.andExpect(jsonPath("$.nome").value("Bolos caseiros"));

		assertThat(log("CATEGORIA_EDITADA", bolos)).containsEntry("nome_antes", "Bolos")
			.containsEntry("nome_depois", "Bolos caseiros");
		// Os produtos da categoria mostram o nome novo
		comToken(get("/api/produtos"), tokenDaLidia).andExpect(jsonPath("$[0].categoria.nome").value("Bolos caseiros"));
	}

	@Test
	void renomeiaSoTrocandoAsMaiusculas() throws Exception {
		comToken(put(ROTA + "/" + bolos), tokenDaLidia, Map.of("nome", "BOLOS"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.nome").value("BOLOS"));
	}

	@Test
	void gravaAOrdemNovaDeUmaVezERegistraNoLog() throws Exception {
		long doces = criarCategoria("Doces finos", 3);

		comToken(put(ROTA + "/ordem"), tokenDaLidia, Map.of("ids", List.of(doces, salgados, bolos)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[*].nome", contains("Doces finos", "Salgados", "Bolos")));

		comToken(get(ROTA), tokenDaLidia).andExpect(jsonPath("$[*].nome", contains("Doces finos", "Salgados", "Bolos")));
		assertThat(jdbc.queryForList("select ordem from categoria where estabelecimento_id = ? and ativo order by id",
				Integer.class, casaBelt)).containsExactly(3, 2, 1);
		Map<String, Object> registro = jdbc.queryForMap("""
				select usuario_id, entidade, entidade_id, (detalhes -> 'antes' -> 'ordem')::text as antes,
				       (detalhes -> 'depois' -> 'ordem')::text as depois
				from log_auditoria where acao = 'CATEGORIA_EDITADA' and estabelecimento_id = ?
				""", casaBelt);
		assertThat(registro).containsEntry("usuario_id", lidia)
			.containsEntry("entidade", "categoria")
			.containsEntry("entidade_id", null)
			.containsEntry("antes", "[%d, %d, %d]".formatted(bolos, salgados, doces))
			.containsEntry("depois", "[%d, %d, %d]".formatted(doces, salgados, bolos));
	}

	@Test
	void aMesmaOrdemNaoGeraLog() throws Exception {
		comToken(put(ROTA + "/ordem"), tokenDaLidia, Map.of("ids", List.of(bolos, salgados))).andExpect(status().isOk());

		assertThat(jdbc.queryForObject("select count(*) from log_auditoria where acao = 'CATEGORIA_EDITADA'",
				Integer.class)).isZero();
	}

	@Test
	void recusaOrdemComIdFaltandoRepetidoOuDeOutraLoja() throws Exception {
		long deOutraLoja = jdbc.queryForObject("""
				insert into categoria (estabelecimento_id, nome, ordem) values (?, 'Bolos', 1) returning id
				""", Long.class, outraLoja);
		long excluida = jdbc.queryForObject("""
				insert into categoria (estabelecimento_id, nome, ordem, ativo) values (?, 'Antiga', 9, false)
				returning id
				""", Long.class, casaBelt);

		for (List<Long> ids : List.of(List.of(salgados), List.of(salgados, salgados), List.of(salgados, deOutraLoja),
				List.of(salgados, bolos, excluida), List.<Long>of())) {
			comToken(put(ROTA + "/ordem"), tokenDaLidia, Map.of("ids", ids))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.codigo").value("DADOS_INVALIDOS"))
				.andExpect(jsonPath("$.campos.ids").value(LISTA_INVALIDA));
		}
		comToken(get(ROTA), tokenDaLidia).andExpect(jsonPath("$[*].nome", contains("Bolos", "Salgados")));
	}

	@Test
	void excluiCategoriaSemProdutoDeFormaLogica() throws Exception {
		long doces = criarCategoria("Doces finos", 3);

		comToken(delete(ROTA + "/" + doces), tokenDaLidia).andExpect(status().isNoContent());

		assertThat(jdbc.queryForObject("select ativo from categoria where id = ?", Boolean.class, doces)).isFalse();
		comToken(get(ROTA), tokenDaLidia).andExpect(jsonPath("$[*].nome", contains("Bolos", "Salgados")));
		assertThat(log("CATEGORIA_EXCLUIDA", doces)).containsEntry("usuario_id", lidia)
			.containsEntry("nome_antes", "Doces finos");
		comToken(delete(ROTA + "/" + doces), tokenDaLidia).andExpect(status().isNotFound());
	}

	@Test
	void naoExcluiCategoriaComProduto() throws Exception {
		comToken(delete(ROTA + "/" + bolos), tokenDaLidia)
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.codigo").value("CATEGORIA_COM_PRODUTO"))
			.andExpect(jsonPath("$.mensagem").value("Mova os produtos desta categoria antes de excluí-la."));
		assertThat(jdbc.queryForObject("select ativo from categoria where id = ?", Boolean.class, bolos)).isTrue();

		// Com os produtos excluídos (RN14), a categoria pode sair; eles continuam ligados a ela
		jdbc.update("update produto set ativo = false where categoria_id = ?", bolos);
		comToken(delete(ROTA + "/" + bolos), tokenDaLidia).andExpect(status().isNoContent());
	}

	@Test
	void naoMostraNemAlteraCategoriasDeOutroEstabelecimento() throws Exception {
		comToken(put(ROTA + "/" + bolos), tokenDeOutraLoja, Map.of("nome", "Invadido"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.codigo").value("CATEGORIA_NAO_ENCONTRADA"));
		comToken(delete(ROTA + "/" + salgados), tokenDeOutraLoja).andExpect(status().isNotFound());
		comToken(put(ROTA + "/ordem"), tokenDeOutraLoja, Map.of("ids", List.of(salgados, bolos)))
			.andExpect(status().isBadRequest());

		assertThat(jdbc.queryForList("select nome || ativo || ordem from categoria where id in (?, ?) order by id",
				String.class, bolos, salgados)).containsExactly("Bolostrue1", "Salgadostrue2");
	}

	@Test
	void exigeOToken() throws Exception {
		mockMvc.perform(get(ROTA)).andExpect(status().isUnauthorized());
		mockMvc.perform(post(ROTA).contentType(MediaType.APPLICATION_JSON).content("{\"nome\":\"Doces\"}"))
			.andExpect(status().isUnauthorized());
		mockMvc.perform(put(ROTA + "/ordem").contentType(MediaType.APPLICATION_JSON).content("{\"ids\":[]}"))
			.andExpect(status().isUnauthorized());
		mockMvc.perform(delete(ROTA + "/" + bolos)).andExpect(status().isUnauthorized());
	}

	private long idDaCategoria(String nome) {
		return jdbc.queryForObject("select id from categoria where estabelecimento_id = ? and nome = ? and ativo",
				Long.class, casaBelt, nome);
	}

	private long criarCategoria(String nome, int ordem) {
		return jdbc.queryForObject("insert into categoria (estabelecimento_id, nome, ordem) values (?, ?, ?) returning id",
				Long.class, casaBelt, nome, ordem);
	}

	private ResultActions comToken(MockHttpServletRequestBuilder requisicao, String token) throws Exception {
		return mockMvc.perform(requisicao.header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
	}

	private ResultActions comToken(MockHttpServletRequestBuilder requisicao, String token, Map<String, ?> corpo)
			throws Exception {
		return mockMvc.perform(requisicao.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
			.contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(corpo)));
	}

	private Map<String, Object> log(String acao, long categoriaId) {
		return jdbc.queryForMap("""
				select usuario_id, estabelecimento_id, ip_origem,
				       detalhes -> 'antes' ->> 'nome' as nome_antes,
				       detalhes -> 'depois' ->> 'nome' as nome_depois
				from log_auditoria where acao = ? and entidade = 'categoria' and entidade_id = ?
				""", acao, categoriaId);
	}

}
