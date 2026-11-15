package br.com.zappi.termos;

import java.time.LocalDate;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Versão vigente dos Termos de uso e da Política de privacidade ({@code zappi.termos}, ZAP-146).
 * Os textos ficam versionados no repositório (ZAP-144); a cada mudança, sobe a versão e a data
 * aqui, e a Lídia volta a ser perguntada no login (RN26).
 *
 * @param versao número inteiro maior que 0, que cresce a cada versão dos textos
 * @param data dia em que a versão passou a valer
 */
@ConfigurationProperties(prefix = "zappi.termos")
public record PropriedadesTermos(int versao, LocalDate data) {

	public PropriedadesTermos {
		if (versao < 1) {
			throw new IllegalArgumentException("zappi.termos.versao precisa ser um número inteiro maior que 0");
		}
		if (data == null) {
			throw new IllegalArgumentException("zappi.termos.data é obrigatória (formato AAAA-MM-DD)");
		}
	}

}
