package br.com.zappi.autenticacao;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Corpo do {@code POST /api/autenticacao/login} (RF01). {@code aceiteTermos} e {@code versaoTermos}
 * são opcionais (ZAP-146): vão juntos, só quando a caixa "Li e concordo com os Termos de uso e a
 * Política de privacidade" foi marcada, e valem se a versão for a vigente.
 */
public record RequisicaoLogin(
		@NotBlank @Email @Size(max = 150) String email,
		@NotBlank @Size(max = 128) String senha,
		Boolean aceiteTermos,
		Integer versaoTermos) {

	public RequisicaoLogin {
		// Espaços nas pontas do e-mail são erro de digitação comum; a senha fica como veio.
		email = email == null ? null : email.trim();
	}

	/** O aceite veio marcado para a {@code versaoVigente}. Outra versão ou caixa vazia não conta. */
	boolean aceitaAVersao(int versaoVigente) {
		return Boolean.TRUE.equals(aceiteTermos) && versaoTermos != null && versaoTermos == versaoVigente;
	}

}
