package br.com.zappi.armazenamento;

/** O Storage não está configurado ou não respondeu. A API responde 503. */
public class ArmazenamentoIndisponivelException extends RuntimeException {

	private static final long serialVersionUID = 1L;

	public ArmazenamentoIndisponivelException(String detalhe, Throwable causa) {
		super(detalhe, causa);
	}

}
