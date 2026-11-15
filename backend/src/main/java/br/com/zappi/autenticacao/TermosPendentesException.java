package br.com.zappi.autenticacao;

/**
 * A Lídia acertou e-mail e senha, mas ainda não aceitou a versão vigente dos Termos de uso e da
 * Política de privacidade (RN26, ZAP-146). Só é lançada depois de conferir a senha, para não
 * revelar se o e-mail existe. O login não emite token.
 */
public class TermosPendentesException extends RuntimeException {

	private static final long serialVersionUID = 1L;

	public TermosPendentesException() {
		super("Para entrar, marque que você leu e concorda com os Termos de uso e a Política de privacidade.");
	}

}
