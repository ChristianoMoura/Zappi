package br.com.zappi.estabelecimento;

/** O slug escolhido já é o link do cardápio de outro estabelecimento. */
public class LinkEmUsoException extends RuntimeException {

	private static final long serialVersionUID = 1L;

	public LinkEmUsoException() {
		super("Esse link já é usado por outro estabelecimento. Escolha outro.");
	}

}
