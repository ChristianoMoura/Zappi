package br.com.zappi.categoria;

/** Já existe uma categoria ativa da loja com esse nome, sem diferenciar maiúsculas. */
public class NomeDeCategoriaEmUsoException extends RuntimeException {

	private static final long serialVersionUID = 1L;

	public NomeDeCategoriaEmUsoException() {
		super("Já existe uma categoria com esse nome. Escolha outro.");
	}

}
