package br.com.zappi.seguranca;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.util.Base64;

import org.junit.jupiter.api.Test;

/** Validação da JWT_CHAVE na subida do backend (ZAP-32). */
class ConfiguracaoJwtTests {

	private final ConfiguracaoJwt configuracao = new ConfiguracaoJwt();

	@Test
	void naoSobeEmProducaoSemAChave() {
		assertThatThrownBy(() -> configuracao.chaveDoJwt(propriedades("", true)))
			.isInstanceOf(IllegalStateException.class)
			.hasMessageContaining("JWT_CHAVE");
	}

	@Test
	void geraChaveAleatoriaForaDaProducao() {
		assertThat(configuracao.chaveDoJwt(propriedades("", false)).getEncoded()).hasSize(32);
	}

	@Test
	void recusaChaveForaDeBase64() {
		assertThatThrownBy(() -> configuracao.chaveDoJwt(propriedades("não é base64!", true)))
			.isInstanceOf(IllegalStateException.class)
			.hasMessageContaining("Base64");
	}

	@Test
	void recusaChaveCurta() {
		String curta = Base64.getEncoder().encodeToString(new byte[16]);

		assertThatThrownBy(() -> configuracao.chaveDoJwt(propriedades(curta, true)))
			.isInstanceOf(IllegalStateException.class)
			.hasMessageContaining("32 bytes");
	}

	@Test
	void usaAChaveInformada() {
		byte[] bytes = new byte[32];
		bytes[0] = 1;

		assertThat(configuracao.chaveDoJwt(propriedades(Base64.getEncoder().encodeToString(bytes), true)).getEncoded())
			.isEqualTo(bytes);
	}

	private static PropriedadesJwt propriedades(String chave, boolean obrigatoria) {
		return new PropriedadesJwt(chave, Duration.ofHours(8), obrigatoria);
	}

}
