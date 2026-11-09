package br.com.zappi.erro;

import java.util.Map;

/**
 * Dados que só o serviço consegue conferir, ex.: um produto que não está no cardápio. A API
 * responde 400 com a mensagem de cada campo em {@code campos}, como na validação dos campos.
 */
public class DadosInvalidosException extends RuntimeException {

	private static final long serialVersionUID = 1L;

	private final transient Map<String, String> campos;

	public DadosInvalidosException(Map<String, String> campos) {
		super("Dados inválidos: " + campos.keySet());
		this.campos = Map.copyOf(campos);
	}

	public Map<String, String> getCampos() {
		return campos;
	}

}
