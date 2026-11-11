package br.com.zappi.cliente;

/** Os dados do cliente já foram anonimizados (RN17). A API responde 409, e nada é gravado. */
public class ClienteJaAnonimizadoException extends RuntimeException {

	private static final long serialVersionUID = 1L;

	public ClienteJaAnonimizadoException() {
		super("Os dados deste cliente já foram apagados.");
	}

}
