package br.com.zappi.estabelecimento;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.AbstractMockHttpServletRequestBuilder;

import br.com.zappi.TestcontainersConfiguration;
import br.com.zappi.armazenamento.ArmazenamentoDeFotos;
import br.com.zappi.armazenamento.ArmazenamentoDoEstabelecimento;
import br.com.zappi.armazenamento.ArmazenamentoIndisponivelException;
import br.com.zappi.seguranca.ServicoToken;
import br.com.zappi.seguranca.UsuarioAutenticado;

/**
 * Logo e capa do estabelecimento (ZAP-119), com um Storage simulado que só guarda as
 * chamadas. Os testes gravam de verdade, porque a foto antiga é apagada depois da
 * confirmação da transação; a limpeza é explícita.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({ TestcontainersConfiguration.class, FotoEstabelecimentoTests.StorageDeTeste.class })
class FotoEstabelecimentoTests {

	private static final String ROTA = "/api/estabelecimento";

	private static final String ENDERECO = "https://storage.teste/estabelecimentos/";

	private static final byte[] JPEG = { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10, 'J', 'F', 'I', 'F' };

	private static final byte[] PNG = { (byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n', 0, 0, 0, 0x0D };

	private static final byte[] GIF = { 'G', 'I', 'F', '8', '9', 'a', 1, 0, 1, 0 };

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private ServicoToken servicoToken;

	@Autowired
	private StorageSimulado storage;

	private String token;

	private long casaBelt;

	@BeforeEach
	void prepara() {
		Map<String, Object> lidia = jdbc.queryForMap(
				"select id, estabelecimento_id from usuario where email = 'lidia@casabelt.com'");
		casaBelt = ((Number) lidia.get("estabelecimento_id")).longValue();
		token = servicoToken.gerar(new UsuarioAutenticado(((Number) lidia.get("id")).longValue(), casaBelt));
	}

	@AfterEach
	void limpa() {
		jdbc.update("update estabelecimento set logo_caminho = null, capa_caminho = null");
		jdbc.update("delete from log_auditoria where entidade = 'estabelecimento'");
		jdbc.update("delete from usuario where email = 'ana@docesdaana.com'");
		jdbc.update("delete from estabelecimento where slug = 'doces-da-ana-logo'");
		storage.memoria.limpar();
	}

	@Test
	void enviaOLogoEGuardaSoOCaminho() throws Exception {
		enviar("logo", "logo.jpg", "image/jpeg", JPEG)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.logo").value(matchesPattern(ENDERECO + casaBelt + "/logo-[0-9a-f]{8}\\.jpg")))
			.andExpect(jsonPath("$.capa").doesNotExist())
			.andExpect(jsonPath("$.nome").value("Casa Belt"));

		String caminho = caminho("logo_caminho");
		assertThat(caminho).matches(casaBelt + "/logo-[0-9a-f]{8}\\.jpg");
		assertThat(storage.memoria.enviados).containsOnlyKeys(caminho);
		assertThat(storage.memoria.enviados.get(caminho).tipo()).isEqualTo("image/jpeg");
		assertThat(storage.memoria.enviados.get(caminho).conteudo()).isEqualTo(JPEG);
		assertThat(jdbc.queryForMap("""
				select detalhes -> 'antes' ->> 'logo' as antes, detalhes -> 'depois' ->> 'logo' as depois
				from log_auditoria where acao = 'ESTABELECIMENTO_EDITADO' and entidade_id = ?
				""", casaBelt)).containsEntry("antes", null).containsEntry("depois", caminho);
	}

	@Test
	void enviaACapaComOTipoDescobertoPeloConteudo() throws Exception {
		enviar("capa", "capa.jpg", "image/jpeg", PNG)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.capa").value(matchesPattern(ENDERECO + casaBelt + "/capa-[0-9a-f]{8}\\.png")))
			.andExpect(jsonPath("$.logo").doesNotExist());

		assertThat(caminho("capa_caminho")).endsWith(".png");
		assertThat(caminho("logo_caminho")).isNull();
	}

	@Test
	void mostraOsEnderecosAoLerOEstabelecimento() throws Exception {
		enviar("logo", "logo.jpg", "image/jpeg", JPEG).andExpect(status().isOk());

		comToken(get(ROTA))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.logo").value(ENDERECO + caminho("logo_caminho")))
			.andExpect(jsonPath("$.capa").doesNotExist());
	}

	@Test
	void trocaOLogoEApagaOAntigoDepoisDeConfirmar() throws Exception {
		enviar("logo", "um.jpg", "image/jpeg", JPEG).andExpect(status().isOk());
		String primeiro = caminho("logo_caminho");

		enviar("logo", "dois.png", "image/png", PNG).andExpect(status().isOk());

		String segundo = caminho("logo_caminho");
		assertThat(segundo).isNotEqualTo(primeiro).endsWith(".png");
		assertThat(storage.memoria.apagados).containsExactly(primeiro);
	}

	@Test
	void removeACapaEApagaOArquivo() throws Exception {
		enviar("capa", "capa.jpg", "image/jpeg", JPEG).andExpect(status().isOk());
		String capa = caminho("capa_caminho");

		comToken(delete(ROTA + "/capa")).andExpect(status().isOk()).andExpect(jsonPath("$.capa").doesNotExist());

		assertThat(caminho("capa_caminho")).isNull();
		assertThat(storage.memoria.apagados).containsExactly(capa);
		assertThat(jdbc.queryForObject("""
				select count(*) from log_auditoria
				where acao = 'ESTABELECIMENTO_EDITADO' and entidade_id = ? and detalhes -> 'depois' ->> 'capa' is null
				""", Integer.class, casaBelt)).isEqualTo(1);
	}

	@Test
	void removerSemFotoNaoMudaNada() throws Exception {
		comToken(delete(ROTA + "/logo")).andExpect(status().isOk()).andExpect(jsonPath("$.logo").doesNotExist());

		assertThat(storage.memoria.apagados).isEmpty();
		assertThat(jdbc.queryForObject("select count(*) from log_auditoria where entidade = 'estabelecimento'",
				Integer.class)).isZero();
	}

	@Test
	void recusaArquivoQueNaoEFoto() throws Exception {
		enviar("logo", "logo.png", "image/png", GIF)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.codigo").value("DADOS_INVALIDOS"))
			.andExpect(jsonPath("$.campos.arquivo").value("Envie a foto em JPG, PNG ou WebP."));

		assertThat(storage.memoria.enviados).isEmpty();
		assertThat(caminho("logo_caminho")).isNull();
	}

	@Test
	void pedeOArquivoQuandoEleNaoVem() throws Exception {
		enviar("logo", "vazio.jpg", "image/jpeg", new byte[0])
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.arquivo").value("Escolha a foto do logo."));
		enviar("capa", "vazio.jpg", "image/jpeg", new byte[0])
			.andExpect(jsonPath("$.campos.arquivo").value("Escolha a foto de capa."));
	}

	@Test
	void enviaParaALojaDoTokenSemMexerNaCasaBelt() throws Exception {
		long outraLoja = jdbc.queryForObject("""
				insert into estabelecimento (nome, slug, telefone_whatsapp)
				values ('Doces da Ana', 'doces-da-ana-logo', '5511900000009') returning id
				""", Long.class);
		long ana = jdbc.queryForObject("""
				insert into usuario (estabelecimento_id, nome, email, senha_hash)
				values (?, 'Ana', 'ana@docesdaana.com', 'hash-de-teste') returning id
				""", Long.class, outraLoja);
		String tokenDaAna = servicoToken.gerar(new UsuarioAutenticado(ana, outraLoja));

		mockMvc.perform(multipart(ROTA + "/logo").file(arquivo("logo.jpg", "image/jpeg", JPEG))
			.header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenDaAna))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.nome").value("Doces da Ana"))
			.andExpect(jsonPath("$.logo").value(matchesPattern(ENDERECO + outraLoja + "/logo-.*")));

		assertThat(caminho("logo_caminho")).isNull();
	}

	@Test
	void respondeIndisponivelSemOStorage() throws Exception {
		storage.memoria.disponivel = false;

		enviar("logo", "logo.jpg", "image/jpeg", JPEG)
			.andExpect(status().isServiceUnavailable())
			.andExpect(jsonPath("$.codigo").value("FOTO_INDISPONIVEL"));
		assertThat(caminho("logo_caminho")).isNull();
	}

	@Test
	void exigeOToken() throws Exception {
		mockMvc.perform(multipart(ROTA + "/logo").file(arquivo("logo.jpg", "image/jpeg", JPEG)))
			.andExpect(status().isUnauthorized());
		mockMvc.perform(delete(ROTA + "/capa")).andExpect(status().isUnauthorized());
	}

	private String caminho(String coluna) {
		return jdbc.queryForObject("select " + coluna + " from estabelecimento where id = ?", String.class, casaBelt);
	}

	private static MockMultipartFile arquivo(String nome, String tipo, byte[] conteudo) {
		return new MockMultipartFile("arquivo", nome, tipo, conteudo);
	}

	private ResultActions enviar(String foto, String nome, String tipo, byte[] conteudo) throws Exception {
		return comToken(multipart(ROTA + "/" + foto).file(arquivo(nome, tipo, conteudo)));
	}

	private ResultActions comToken(AbstractMockHttpServletRequestBuilder<?> requisicao) throws Exception {
		return mockMvc.perform(requisicao.header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
	}

	record Envio(byte[] conteudo, String tipo) {
	}

	/** Storage em memória do bucket do estabelecimento: guarda o que foi enviado e apagado. */
	static class StorageEmMemoria implements ArmazenamentoDeFotos {

		final Map<String, Envio> enviados = new LinkedHashMap<>();

		final List<String> apagados = new ArrayList<>();

		boolean disponivel = true;

		void limpar() {
			enviados.clear();
			apagados.clear();
			disponivel = true;
		}

		@Override
		public boolean disponivel() {
			return disponivel;
		}

		@Override
		public void enviar(String caminho, byte[] conteudo, String tipo) {
			if (!disponivel) {
				throw new ArmazenamentoIndisponivelException("simulado", null);
			}
			enviados.put(caminho, new Envio(conteudo, tipo));
		}

		@Override
		public void apagar(String caminho) {
			if (caminho != null) {
				apagados.add(caminho);
			}
		}

		@Override
		public String enderecoPublico(String caminho) {
			return caminho == null ? null : ENDERECO + caminho;
		}

	}

	/**
	 * Só o tipo do estabelecimento é trocado: o Storage em memória não vira um bean de
	 * {@link ArmazenamentoDeFotos}, que é o dos produtos (ZAP-40).
	 */
	static class StorageSimulado extends ArmazenamentoDoEstabelecimento {

		final StorageEmMemoria memoria;

		StorageSimulado() {
			this(new StorageEmMemoria());
		}

		private StorageSimulado(StorageEmMemoria memoria) {
			super(memoria);
			this.memoria = memoria;
		}

	}

	@TestConfiguration(proxyBeanMethods = false)
	static class StorageDeTeste {

		@Bean
		@Primary
		StorageSimulado storageDoEstabelecimentoSimulado() {
			return new StorageSimulado();
		}

	}

}
