package br.com.zappi.termos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;

/** A versão vigente dos termos precisa ser um inteiro maior que 0, com data (ZAP-146). */
class PropriedadesTermosTests {

	private static final LocalDate DATA = LocalDate.of(2026, 11, 14);

	@Test
	void aceitaVersaoMaiorQueZeroComData() {
		PropriedadesTermos propriedades = new PropriedadesTermos(3, DATA);

		assertThat(propriedades.versao()).isEqualTo(3);
		assertThat(propriedades.data()).isEqualTo(DATA);
	}

	@Test
	void recusaVersaoZeroOuNegativa() {
		assertThatThrownBy(() -> new PropriedadesTermos(0, DATA)).isInstanceOf(IllegalArgumentException.class)
			.hasMessageContaining("zappi.termos.versao");
		assertThatThrownBy(() -> new PropriedadesTermos(-1, DATA)).isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void recusaDataVazia() {
		assertThatThrownBy(() -> new PropriedadesTermos(1, null)).isInstanceOf(IllegalArgumentException.class)
			.hasMessageContaining("zappi.termos.data");
	}

}
