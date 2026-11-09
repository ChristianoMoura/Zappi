package br.com.zappi.produto;

/** O produto tem foto, mas a edição apagou o texto alternativo (RN15). */
public class FotoSemTextoAlternativoException extends RuntimeException {

	private static final long serialVersionUID = 1L;

	public FotoSemTextoAlternativoException() {
		super("Descreva a foto para quem não consegue vê-la.");
	}

}
