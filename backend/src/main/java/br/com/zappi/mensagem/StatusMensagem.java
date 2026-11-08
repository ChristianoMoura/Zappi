package br.com.zappi.mensagem;

/**
 * Status da mensagem, gravado como número em {@code mensagem_whatsapp.status}. Vira
 * Enviada quando a Lídia clica em "Enviar no WhatsApp" (ZAP-64).
 */
public enum StatusMensagem {

	PENDENTE(1),
	ENVIADA(2),
	FALHA(3);

	private final short codigo;

	StatusMensagem(int codigo) {
		this.codigo = (short) codigo;
	}

	public short getCodigo() {
		return codigo;
	}

	public static StatusMensagem deCodigo(short codigo) {
		for (StatusMensagem status : values()) {
			if (status.codigo == codigo) {
				return status;
			}
		}
		throw new IllegalArgumentException("Status de mensagem desconhecido: " + codigo);
	}

}
