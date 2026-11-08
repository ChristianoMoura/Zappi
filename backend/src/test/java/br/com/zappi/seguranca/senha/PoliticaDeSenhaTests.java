package br.com.zappi.seguranca.senha;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import jakarta.validation.Validation;
import jakarta.validation.Validator;

/** Política de senha (ZAP-33, ISO 27002 5.17). */
class PoliticaDeSenhaTests {

	@ParameterizedTest
	@ValueSource(strings = { "Bolo@2026", "abc123!@", "confeitaria#1", "Açúcar 9!", "12345678a." })
	void aceitaSenhaComLetraNumeroEEspecial(String senha) {
		assertThat(PoliticaDeSenha.atende(senha)).isTrue();
	}

	@ParameterizedTest
	@NullAndEmptySource
	@ValueSource(strings = {
			"Bo@2026", // 7 caracteres
			"BoloBolo@", // sem número
			"12345678@", // sem letra
			"Bolo2026", // sem caractere especial
			"Bolo 2026", // espaço não conta como especial
	})
	void recusaSenhaForaDaPolitica(String senha) {
		assertThat(PoliticaDeSenha.atende(senha)).isFalse();
	}

	@Test
	void recusaSenhaAcimaDoLimiteDoBcrypt() {
		String noLimite = "Aa1@" + "x".repeat(68); // 72 bytes
		String acima = noLimite + "x"; // 73 bytes
		String acentuada = "Aa1@" + "ç".repeat(35); // 4 + 70 bytes = 74

		assertThat(PoliticaDeSenha.atende(noLimite)).isTrue();
		assertThat(PoliticaDeSenha.atende(acima)).isFalse();
		assertThat(PoliticaDeSenha.atende(acentuada)).isFalse();
	}

	record RequisicaoComSenha(@SenhaForte String senha) {
	}

	@Test
	void aAnotacaoSenhaForteUsaAPolitica() {
		try (var fabrica = Validation.buildDefaultValidatorFactory()) {
			Validator validador = fabrica.getValidator();

			assertThat(validador.validate(new RequisicaoComSenha("Bolo@2026"))).isEmpty();
			assertThat(validador.validate(new RequisicaoComSenha("fraca")))
				.singleElement()
				.satisfies(erro -> assertThat(erro.getMessage()).isEqualTo(PoliticaDeSenha.MENSAGEM));
		}
	}

}
