package br.com.zappi.produto;

/**
 * Produto inexistente, já excluído ou de outro estabelecimento. Os três casos têm a
 * mesma resposta (404), para não revelar produtos de outros estabelecimentos (RN01).
 */
public class ProdutoNaoEncontradoException extends RuntimeException {

	private static final long serialVersionUID = 1L;

	public ProdutoNaoEncontradoException() {
		super("Produto não encontrado.");
	}

}
