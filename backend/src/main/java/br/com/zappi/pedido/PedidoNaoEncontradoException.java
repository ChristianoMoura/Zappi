package br.com.zappi.pedido;

/**
 * Número inexistente ou de outro estabelecimento. Os dois casos têm a mesma resposta (404),
 * para não revelar pedidos de outros estabelecimentos (RN01).
 */
public class PedidoNaoEncontradoException extends RuntimeException {

	private static final long serialVersionUID = 1L;

	public PedidoNaoEncontradoException() {
		super("Pedido não encontrado.");
	}

}
