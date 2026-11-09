package br.com.zappi.pedido;

/**
 * Mudança de status fora das transições permitidas (RN03), ex.: confirmar um pedido que não
 * está Novo. A API responde 409, e nada é gravado.
 */
public class TransicaoNaoPermitidaException extends RuntimeException {

	private static final long serialVersionUID = 1L;

	public TransicaoNaoPermitidaException(String mensagem) {
		super(mensagem);
	}

}
