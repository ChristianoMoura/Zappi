package br.com.zappi.autenticacao;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Corpo do {@code POST /api/autenticacao/login} (RF01). */
public record RequisicaoLogin(
		@NotBlank @Email @Size(max = 150) String email,
		@NotBlank @Size(max = 128) String senha) {

	public RequisicaoLogin {
		// Espaços nas pontas do e-mail são erro de digitação comum; a senha fica como veio.
		email = email == null ? null : email.trim();
	}

}
