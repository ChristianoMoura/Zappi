package br.com.zappi.armazenamento;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

/** Chamadas à API do Supabase Storage (ZAP-40), contra um servidor simulado. */
class ArmazenamentoSupabaseTests {

	private static final String PROJETO = "https://projeto-teste.supabase.co";

	private static final String CHAVE = "chave-de-teste";

	private static final PropriedadesArmazenamento CONFIGURADO = new PropriedadesArmazenamento(PROJETO + "/", CHAVE,
			"produtos", true);

	private final RestClient.Builder construtor = RestClient.builder();

	private final MockRestServiceServer servidor = MockRestServiceServer.bindTo(construtor).build();

	@Test
	void enviaComAChaveSecretaParaOCaminhoNoBucket() {
		byte[] foto = { 1, 2, 3 };
		servidor.expect(requestTo(PROJETO + "/storage/v1/object/produtos/1/7-abcd1234.jpg"))
			.andExpect(method(HttpMethod.POST))
			.andExpect(header("apikey", CHAVE))
			.andExpect(header("Authorization", "Bearer " + CHAVE))
			.andExpect(header("Content-Type", "image/jpeg"))
			.andExpect(content().bytes(foto))
			.andRespond(withSuccess());

		new ArmazenamentoSupabase(CONFIGURADO, construtor).enviar("1/7-abcd1234.jpg", foto, "image/jpeg");

		servidor.verify();
	}

	@Test
	void apagaOArquivo() {
		servidor.expect(requestTo(PROJETO + "/storage/v1/object/produtos/1/7-abcd1234.jpg"))
			.andExpect(method(HttpMethod.DELETE))
			.andRespond(withSuccess());

		new ArmazenamentoSupabase(CONFIGURADO, construtor).apagar("1/7-abcd1234.jpg");

		servidor.verify();
	}

	@Test
	void falhaDoStorageVira503NoEnvioESoAvisoAoApagar() {
		servidor.expect(requestTo(PROJETO + "/storage/v1/object/produtos/1/7.jpg")).andRespond(withServerError());
		servidor.expect(requestTo(PROJETO + "/storage/v1/object/produtos/1/8.jpg")).andRespond(withServerError());
		ArmazenamentoSupabase armazenamento = new ArmazenamentoSupabase(CONFIGURADO, construtor);

		assertThatThrownBy(() -> armazenamento.enviar("1/7.jpg", new byte[] { 1 }, "image/jpeg"))
			.isInstanceOf(ArmazenamentoIndisponivelException.class);
		armazenamento.apagar("1/8.jpg");
	}

	@Test
	void montaOEnderecoPublico() {
		ArmazenamentoSupabase armazenamento = new ArmazenamentoSupabase(CONFIGURADO, construtor);

		assertThat(armazenamento.enderecoPublico("1/7-abcd1234.jpg"))
			.isEqualTo(PROJETO + "/storage/v1/object/public/produtos/1/7-abcd1234.jpg");
		assertThat(armazenamento.enderecoPublico(null)).isNull();
	}

	@Test
	void naoSobeEmProducaoSemAConfiguracao() {
		PropriedadesArmazenamento vazio = new PropriedadesArmazenamento("", "", null, true);

		assertThatThrownBy(() -> new ArmazenamentoSupabase(vazio, construtor))
			.isInstanceOf(IllegalStateException.class)
			.hasMessageContaining("SUPABASE_URL");
	}

	@Test
	void foraDaProducaoFicaIndisponivelSemAConfiguracao() {
		ArmazenamentoSupabase armazenamento = new ArmazenamentoSupabase(
				new PropriedadesArmazenamento(null, null, null, false), construtor);

		assertThat(armazenamento.disponivel()).isFalse();
		assertThatThrownBy(() -> armazenamento.enviar("1/7.jpg", new byte[] { 1 }, "image/jpeg"))
			.isInstanceOf(ArmazenamentoIndisponivelException.class);
	}

}
