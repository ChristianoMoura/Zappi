package br.com.zappi.estabelecimento;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
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
 * Consulta e edição do estabelecimento (ZAP-36). Cada teste roda numa transação desfeita no
 * fim; a Lídia usa a Casa Belt da V2, e um segundo estabelecimento confere o isolamento (RN01).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class EstabelecimentoTests {

	private static final String ROTA = "/api/estabelecimento";

	private static final String LINK_DA_OUTRA_LOJA = "doces-da-ana-teste";

	private static final OffsetDateTime ANTES_DOS_TESTES = OffsetDateTime.parse("2026-01-01T00:00:00Z");

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

	@BeforeEach
	void preparaUsuarios() {
		Map<String, Object> dadosDaLidia = jdbc.queryForMap(
				"select id, estabelecimento_id from usuario where email = 'lidia@casabelt.com'");
		lidia = ((Number) dadosDaLidia.get("id")).longValue();
		casaBelt = ((Number) dadosDaLidia.get("estabelecimento_id")).longValue();
		tokenDaLidia = servicoToken.gerar(new UsuarioAutenticado(lidia, casaBelt));
		jdbc.update("update estabelecimento set atualizado_em = ? where id = ?", ANTES_DOS_TESTES, casaBelt);

		outraLoja = jdbc.queryForObject("""
				insert into estabelecimento (nome, slug, telefone_whatsapp)
				values ('Doces da Ana', ?, '5511900000009') returning id
				""", Long.class, LINK_DA_OUTRA_LOJA);
		long ana = jdbc.queryForObject("""
				insert into usuario (estabelecimento_id, nome, email, senha_hash)
				values (?, 'Ana', 'ana@docesdaana.com', 'hash-de-teste') returning id
				""", Long.class, outraLoja);
		tokenDeOutraLoja = servicoToken.gerar(new UsuarioAutenticado(ana, outraLoja));
	}

	@Test
	void mostraOEstabelecimentoDaUsuariaLogada() throws Exception {
		comToken(get(ROTA), tokenDaLidia)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.nome").value("Casa Belt"))
			.andExpect(jsonPath("$.slug").value("casa-belt"))
			.andExpect(jsonPath("$.descricao").value("Confeitaria artesanal: bolos e salgados sob encomenda."))
			.andExpect(jsonPath("$.whatsapp").value("5511900000000"))
			.andExpect(jsonPath("$.cep").doesNotExist());
	}

	@Test
	void editaOEstabelecimentoERegistraOAntesEODepois() throws Exception {
		comToken(put(ROTA), tokenDaLidia, casaBelt())
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.nome").value("Casa Belt Confeitaria"))
			.andExpect(jsonPath("$.slug").value("casa-belt"))
			.andExpect(jsonPath("$.whatsapp").value("5511988887777"))
			.andExpect(jsonPath("$.emailContato").value("contato@casabelt.com"))
			.andExpect(jsonPath("$.cep").value("01000000"))
			.andExpect(jsonPath("$.numero").value("S/N"))
			.andExpect(jsonPath("$.uf").value("SP"));

		Map<String, Object> salvo = jdbc.queryForMap(
				"select nome, telefone_whatsapp, cidade, atualizado_em from estabelecimento where id = ?", casaBelt);
		assertThat(salvo).containsEntry("nome", "Casa Belt Confeitaria")
			.containsEntry("telefone_whatsapp", "5511988887777")
			.containsEntry("cidade", "São Paulo");
		assertThat(jdbc.queryForObject("select atualizado_em > ? from estabelecimento where id = ?", Boolean.class,
				ANTES_DOS_TESTES, casaBelt)).isTrue();

		assertThat(log()).containsEntry("usuario_id", lidia)
			.containsEntry("estabelecimento_id", casaBelt)
			.containsEntry("nome_antes", "Casa Belt")
			.containsEntry("nome_depois", "Casa Belt Confeitaria")
			.containsEntry("whatsapp_antes", "5511900000000")
			.containsEntry("whatsapp_depois", "5511988887777");
	}

	@Test
	void tiraOsSeparadoresEGuardaOsOpcionaisVaziosComoNulo() throws Exception {
		Map<String, Object> dados = casaBelt();
		dados.put("whatsapp", "+55 (11) 98888-7777");
		dados.put("cep", "01000-000");
		dados.put("uf", " sp ");
		dados.put("complemento", "   ");
		dados.remove("descricao");

		comToken(put(ROTA), tokenDaLidia, dados)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.whatsapp").value("5511988887777"))
			.andExpect(jsonPath("$.cep").value("01000000"))
			.andExpect(jsonPath("$.uf").value("SP"))
			.andExpect(jsonPath("$.complemento").doesNotExist())
			.andExpect(jsonPath("$.descricao").doesNotExist());

		assertThat(jdbc.queryForObject("select complemento is null and descricao is null from estabelecimento where id = ?",
				Boolean.class, casaBelt)).isTrue();
	}

	@Test
	void recusaCamposObrigatoriosVaziosComAMensagemDeCadaCampo() throws Exception {
		comToken(put(ROTA), tokenDaLidia, Map.of("nome", " ", "slug", "", "whatsapp", " ", "descricao", "x"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.codigo").value("DADOS_INVALIDOS"))
			.andExpect(jsonPath("$.campos.nome").value("Digite o nome do estabelecimento."))
			.andExpect(jsonPath("$.campos.slug").value("Digite o link do cardápio."))
			.andExpect(jsonPath("$.campos.whatsapp").value("Digite o WhatsApp com DDD."));

		assertThat(quantidadeDeEdicoesNoLog()).isZero();
	}

	@Test
	void recusaFormatosInvalidos() throws Exception {
		Map<String, Object> dados = casaBelt();
		dados.put("slug", "Casa Belt");
		dados.put("whatsapp", "11988887777");
		dados.put("emailContato", "contato@casabelt");
		dados.put("cep", "0100000");
		dados.put("uf", "XX");

		comToken(put(ROTA), tokenDaLidia, dados)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.slug")
				.value("Use só letras minúsculas, números e hífen, sem espaços. Ex.: casa-belt"))
			.andExpect(jsonPath("$.campos.whatsapp")
				.value("O WhatsApp precisa ter 13 números: 55, o DDD e o número. Ex.: 5511900000000"))
			.andExpect(jsonPath("$.campos.emailContato").value("Confira o e-mail. Ele precisa ter \"@\" e um ponto."))
			.andExpect(jsonPath("$.campos.cep").value("O CEP tem 8 números. Ex.: 01000-000"))
			.andExpect(jsonPath("$.campos.uf").value("Escolha o estado na lista."));
	}

	@Test
	void recusaLetrasNoCepEmVezDeApagarEmSilencio() throws Exception {
		Map<String, Object> dados = casaBelt();
		dados.put("cep", "abc");

		comToken(put(ROTA), tokenDaLidia, dados)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.cep").value("O CEP tem 8 números. Ex.: 01000-000"));
	}

	@Test
	void recusaTextosMaioresQueAColuna() throws Exception {
		Map<String, Object> dados = casaBelt();
		dados.put("nome", "C".repeat(101));
		dados.put("numero", "1".repeat(11));

		comToken(put(ROTA), tokenDaLidia, dados)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.nome").value("Use no máximo 100 caracteres."))
			.andExpect(jsonPath("$.campos.numero").value("Use no máximo 10 caracteres."));
	}

	@Test
	void recusaOLinkDeOutroEstabelecimento() throws Exception {
		Map<String, Object> dados = casaBelt();
		dados.put("slug", LINK_DA_OUTRA_LOJA);

		comToken(put(ROTA), tokenDaLidia, dados)
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.codigo").value("LINK_EM_USO"))
			.andExpect(jsonPath("$.campos.slug").value("Esse link já é usado por outro estabelecimento. Escolha outro."));

		assertThat(jdbc.queryForObject("select slug from estabelecimento where id = ?", String.class, casaBelt))
			.isEqualTo("casa-belt");
		assertThat(quantidadeDeEdicoesNoLog()).isZero();
	}

	@Test
	void naoMostraNemAlteraOutroEstabelecimento() throws Exception {
		comToken(get(ROTA), tokenDeOutraLoja)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.nome").value("Doces da Ana"))
			.andExpect(jsonPath("$.slug").value(LINK_DA_OUTRA_LOJA));

		Map<String, Object> dados = casaBelt();
		dados.put("slug", "doces-da-ana-nova");
		comToken(put(ROTA), tokenDeOutraLoja, dados).andExpect(status().isOk());

		assertThat(jdbc.queryForObject("select nome || slug from estabelecimento where id = ?", String.class, casaBelt))
			.isEqualTo("Casa Beltcasa-belt");
		assertThat(jdbc.queryForObject("select slug from estabelecimento where id = ?", String.class, outraLoja))
			.isEqualTo("doces-da-ana-nova");
	}

	@Test
	void respondeNaoEncontradoQuandoOEstabelecimentoDoTokenNaoExiste() throws Exception {
		String tokenSemLoja = servicoToken.gerar(new UsuarioAutenticado(lidia, 999_999L));

		comToken(get(ROTA), tokenSemLoja)
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.codigo").value("ESTABELECIMENTO_NAO_ENCONTRADO"));
	}

	@Test
	void exigeOToken() throws Exception {
		mockMvc.perform(get(ROTA)).andExpect(status().isUnauthorized());
		mockMvc.perform(put(ROTA).contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(casaBelt())))
			.andExpect(status().isUnauthorized());
	}

	/** Todos os campos da tela, já no formato que o banco guarda. */
	private static Map<String, Object> casaBelt() {
		Map<String, Object> dados = new LinkedHashMap<>();
		dados.put("nome", "Casa Belt Confeitaria");
		dados.put("slug", "casa-belt");
		dados.put("descricao", "Bolos e salgados artesanais sob encomenda.");
		dados.put("whatsapp", "5511988887777");
		dados.put("emailContato", "contato@casabelt.com");
		dados.put("cep", "01000000");
		dados.put("logradouro", "Rua das Flores");
		dados.put("numero", "S/N");
		dados.put("complemento", "Casa 2");
		dados.put("bairro", "Centro");
		dados.put("cidade", "São Paulo");
		dados.put("uf", "SP");
		return dados;
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

	private Map<String, Object> log() {
		return jdbc.queryForMap("""
				select usuario_id, estabelecimento_id,
				       detalhes -> 'antes' ->> 'nome' as nome_antes,
				       detalhes -> 'depois' ->> 'nome' as nome_depois,
				       detalhes -> 'antes' ->> 'whatsapp' as whatsapp_antes,
				       detalhes -> 'depois' ->> 'whatsapp' as whatsapp_depois
				from log_auditoria
				where acao = 'ESTABELECIMENTO_EDITADO' and entidade = 'estabelecimento' and entidade_id = ?
				""", casaBelt);
	}

	private long quantidadeDeEdicoesNoLog() {
		return jdbc.queryForObject("select count(*) from log_auditoria where acao = 'ESTABELECIMENTO_EDITADO'",
				Long.class);
	}

}
