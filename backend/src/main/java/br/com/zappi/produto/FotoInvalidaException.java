package br.com.zappi.produto;

/** Foto ou texto alternativo inválido. A API responde 400 com a mensagem no campo. */
public class FotoInvalidaException extends RuntimeException {

	private static final long serialVersionUID = 1L;

	private final String campo;

	public FotoInvalidaException(String campo, String mensagem) {
		super(mensagem);
		this.campo = campo;
	}

	public String getCampo() {
		return campo;
	}

}
