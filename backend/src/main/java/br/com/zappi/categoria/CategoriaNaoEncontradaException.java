package br.com.zappi.categoria;

/** Categoria inexistente, já excluída ou de outro estabelecimento (RN01). */
public class CategoriaNaoEncontradaException extends RuntimeException {

	private static final long serialVersionUID = 1L;

	public CategoriaNaoEncontradaException() {
		super("Categoria não encontrada.");
	}

}
