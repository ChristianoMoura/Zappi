package br.com.zappi.autenticacao;

import java.time.Duration;

/**
 * Login bloqueado por excesso de falhas (RF02, ZAP-85). A mensagem não revela se o
 * e-mail existe: o bloqueio vale para qualquer e-mail digitado.
 */
public class LoginBloqueadoException extends RuntimeException {

	private static final long serialVersionUID = 1L;

	private final Duration restante;

	public LoginBloqueadoException(Duration restante) {
		super("Muitas tentativas sem sucesso. Espere 15 minutos e tente novamente.");
		this.restante = restante;
	}

	/** Quanto falta para liberar, para o header {@code Retry-After}. */
	public Duration getRestante() {
		return restante;
	}

}
