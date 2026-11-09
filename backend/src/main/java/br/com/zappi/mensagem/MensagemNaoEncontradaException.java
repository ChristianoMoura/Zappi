package br.com.zappi.mensagem;

/** Mensagem inexistente, de outro pedido ou de outro estabelecimento. A API responde 404. */
public class MensagemNaoEncontradaException extends RuntimeException {

	private static final long serialVersionUID = 1L;

	public MensagemNaoEncontradaException() {
		super("Mensagem não encontrada.");
	}

}
