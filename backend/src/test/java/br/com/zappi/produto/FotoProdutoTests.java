package br.com.zappi.produto;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.Arrays;
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

import br.com.zappi.TestcontainersConfiguration;
import br.com.zappi.armazenamento.ArmazenamentoDeFotos;
import br.com.zappi.armazenamento.ArmazenamentoIndisponivelException;
import br.com.zappi.seguranca.ServicoToken;
import br.com.zappi.seguranca.UsuarioAutenticado;

/**
 * Envio da foto do produto (ZAP-40), com um Storage simulado que só guarda as chamadas.
 * Os testes gravam de verdade, porque a foto antiga é apagada depois da confirmação da
 * transação; a limpeza é explícita.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({ TestcontainersConfiguration.class, FotoProdutoTests.StorageDeTeste.class })
class FotoProdutoTests {

	private static final String ENDERECO = "https://storage.teste/";

	private static final byte[] JPEG = { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10, 'J', 'F', 'I', 'F' };

	private static final byte[] PNG = { (byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n', 0, 0, 0, 0x0D };

	private static final byte[] WEBP = { 'R', 'I', 'F', 'F', 0x24, 0, 0, 0, 'W', 'E', 'B', 'P', 'V', 'P', '8', ' ' };

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

	private long brigadeiro;

	@BeforeEach
	void prepara() {
		Map<String, Object> lidia = jdbc.queryForMap(
				"select id, estabelecimento_id from usuario where email = 'lidia@casabelt.com'");
		casaBelt = ((Number) lidia.get("estabelecimento_id")).longValue();
		token = servicoToken.gerar(new UsuarioAutenticado(((Number) lidia.get("id")).longValue(), casaBelt));
		brigadeiro = jdbc.queryForObject(
				"select id from produto where estabelecimento_id = ? and sabor = 'Brigadeiro de chocolate'", Long.class,
				casaBelt);
	}

	@AfterEach
	void limpa() {
		jdbc.update("update produto set foto_caminho = null, foto_texto_alternativo = null where estabelecimento_id = ?",
				casaBelt);
		jdbc.update("delete from log_auditoria where entidade = 'produto'");
		jdbc.update("delete from usuario where email = 'ana@docesdaana.com'");
		jdbc.update("delete from estabelecimento where slug = 'doces-da-ana-foto'");
		storage.limpar();
	}

	@Test
	void enviaAFotoEGuardaSoOCaminho() throws Exception {
		enviar(brigadeiro, "bolo.jpg", "image/jpeg", JPEG, "Bolo de brigadeiro com granulado")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.foto").value(matchesPattern(ENDERECO + casaBelt + "/" + brigadeiro + "-[0-9a-f]{8}\\.jpg")))
			.andExpect(jsonPath("$.textoAlternativo").value("Bolo de brigadeiro com granulado"));

		String caminho = jdbc.queryForObject("select foto_caminho from produto where id = ?", String.class, brigadeiro);
		assertThat(caminho).matches(casaBelt + "/" + brigadeiro + "-[0-9a-f]{8}\\.jpg");
		assertThat(storage.enviados).containsOnlyKeys(caminho);
		assertThat(storage.enviados.get(caminho).tipo()).isEqualTo("image/jpeg");
		assertThat(storage.enviados.get(caminho).conteudo()).isEqualTo(JPEG);
		assertThat(jdbc.queryForObject("""
				select detalhes -> 'depois' ->> 'foto' from log_auditoria
				where acao = 'PRODUTO_EDITADO' and entidade_id = ?
				""", String.class, brigadeiro)).isEqualTo(caminho);
	}

	@Test
	void descobreOTipoPeloConteudo() throws Exception {
		enviar(brigadeiro, "foto.jpg", "image/jpeg", PNG, "Bolo").andExpect(jsonPath("$.foto").value(matchesPattern(".*\\.png")));
		enviar(brigadeiro, "foto", "application/octet-stream", WEBP, "Bolo")
			.andExpect(jsonPath("$.foto").value(matchesPattern(".*\\.webp")));
	}

	@Test
	void trocaAFotoEApagaAAntigaDepoisDeConfirmar() throws Exception {
		enviar(brigadeiro, "um.jpg", "image/jpeg", JPEG, "Primeira").andExpect(status().isOk());
		String primeira = jdbc.queryForObject("select foto_caminho from produto where id = ?", String.class, brigadeiro);

		enviar(brigadeiro, "dois.jpg", "image/jpeg", JPEG, "Segunda").andExpect(status().isOk());

		String segunda = jdbc.queryForObject("select foto_caminho from produto where id = ?", String.class, brigadeiro);
		assertThat(segunda).isNotEqualTo(primeira);
		assertThat(storage.apagados).containsExactly(primeira);
	}

	@Test
	void removeAFoto() throws Exception {
		enviar(brigadeiro, "um.jpg", "image/jpeg", JPEG, "Bolo").andExpect(status().isOk());
		String caminho = jdbc.queryForObject("select foto_caminho from produto where id = ?", String.class, brigadeiro);

		mockMvc.perform(delete("/api/produtos/" + brigadeiro + "/foto").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.foto").value(nullValue()))
			.andExpect(jsonPath("$.textoAlternativo").value(nullValue()));

		assertThat(jdbc.queryForMap("select foto_caminho, foto_texto_alternativo from produto where id = ?", brigadeiro))
			.containsEntry("foto_caminho", null)
			.containsEntry("foto_texto_alternativo", null);
		assertThat(storage.apagados).containsExactly(caminho);
	}

	@Test
	void aListaDeProdutosTrazOEnderecoDaFoto() throws Exception {
		enviar(brigadeiro, "um.jpg", "image/jpeg", JPEG, "Bolo").andExpect(status().isOk());

		mockMvc.perform(get("/api/produtos").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
			.andExpect(jsonPath("$[0].foto").value(matchesPattern(ENDERECO + ".*\\.jpg")))
			.andExpect(jsonPath("$[1].foto").value(nullValue()));
	}

	@Test
	void recusaArquivoQueNaoEImagemMesmoComExtensaoJpg() throws Exception {
		enviar(brigadeiro, "falsa.jpg", "image/jpeg", "<?php echo 1; ?>".getBytes(), "Bolo")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.arquivo").value("Envie a foto em JPG, PNG ou WebP."));
		assertThat(storage.enviados).isEmpty();
	}

	@Test
	void recusaFotoMaiorQueCincoMb() throws Exception {
		byte[] grande = Arrays.copyOf(JPEG, (int) FotoRecebida.TAMANHO_MAXIMO + 1);

		enviar(brigadeiro, "grande.jpg", "image/jpeg", grande, "Bolo")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.arquivo").value("A foto pode ter até 5 MB."));
		assertThat(storage.enviados).isEmpty();
	}

	@Test
	void exigeOTextoAlternativoEOArquivo() throws Exception {
		enviar(brigadeiro, "um.jpg", "image/jpeg", JPEG, "  ")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.textoAlternativo").value("Descreva a foto para quem não consegue vê-la."));
		mockMvc.perform(multipart("/api/produtos/" + brigadeiro + "/foto").param("textoAlternativo", "Bolo")
			.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.arquivo").value("Escolha a foto do produto."));
		assertThat(storage.enviados).isEmpty();
	}

	@Test
	void naoEnviaFotoParaProdutoDeOutroEstabelecimento() throws Exception {
		long outraLoja = jdbc.queryForObject("""
				insert into estabelecimento (nome, slug, telefone_whatsapp)
				values ('Doces da Ana', 'doces-da-ana-foto', '5511900000009') returning id
				""", Long.class);
		long ana = jdbc.queryForObject("""
				insert into usuario (estabelecimento_id, nome, email, senha_hash)
				values (?, 'Ana', 'ana@docesdaana.com', 'hash-de-teste') returning id
				""", Long.class, outraLoja);
		String tokenDaAna = servicoToken.gerar(new UsuarioAutenticado(ana, outraLoja));

		mockMvc.perform(multipart("/api/produtos/" + brigadeiro + "/foto").file(arquivo("um.jpg", "image/jpeg", JPEG))
			.param("textoAlternativo", "Invasão")
			.header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenDaAna))
			.andExpect(status().isNotFound());
		assertThat(storage.enviados).isEmpty();
	}

	@Test
	void respondeIndisponivelSemOStorage() throws Exception {
		storage.disponivel = false;

		enviar(brigadeiro, "um.jpg", "image/jpeg", JPEG, "Bolo")
			.andExpect(status().isServiceUnavailable())
			.andExpect(jsonPath("$.codigo").value("FOTO_INDISPONIVEL"));
	}

	@Test
	void exigeOToken() throws Exception {
		mockMvc.perform(multipart("/api/produtos/" + brigadeiro + "/foto").file(arquivo("um.jpg", "image/jpeg", JPEG))
			.param("textoAlternativo", "Bolo"))
			.andExpect(status().isUnauthorized());
	}

	private ResultActions enviar(long produto, String nome, String tipo, byte[] conteudo, String textoAlternativo)
			throws Exception {
		return mockMvc.perform(multipart("/api/produtos/" + produto + "/foto").file(arquivo(nome, tipo, conteudo))
			.param("textoAlternativo", textoAlternativo)
			.header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
	}

	private static MockMultipartFile arquivo(String nome, String tipo, byte[] conteudo) {
		return new MockMultipartFile("arquivo", nome, tipo, conteudo);
	}

	record Envio(byte[] conteudo, String tipo) {
	}

	/** Storage em memória: guarda o que foi enviado e apagado. */
	static class StorageSimulado implements ArmazenamentoDeFotos {

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

	@TestConfiguration(proxyBeanMethods = false)
	static class StorageDeTeste {

		@Bean
		@Primary
		StorageSimulado storageSimulado() {
			return new StorageSimulado();
		}

	}

}
