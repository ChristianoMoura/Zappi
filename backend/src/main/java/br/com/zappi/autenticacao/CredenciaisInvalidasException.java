package br.com.zappi.autenticacao;

/**
 * E-mail inexistente, senha errada ou usuária desativada. Os três casos têm a mesma
 * resposta, para não revelar qual foi o problema (RF02).
 */
public class CredenciaisInvalidasException extends RuntimeException {

	private static final long serialVersionUID = 1L;

	public CredenciaisInvalidasException() {
		super("E-mail ou senha incorretos.");
	}

}
