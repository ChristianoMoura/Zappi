package br.com.zappi.cardapio;

/**
 * Limite de envios do Portal do Cliente atingido (ZAP-112): 5 pedidos por hora pelo mesmo IP
 * ou 3 em 24 horas pelo mesmo WhatsApp. A API responde 429, e nada é gravado.
 */
public class EnviosDemaisException extends RuntimeException {

	private static final long serialVersionUID = 1L;

	public EnviosDemaisException() {
		super("Você já enviou muitos pedidos. Tente mais tarde ou fale com a Lídia pelo WhatsApp.");
	}

}
