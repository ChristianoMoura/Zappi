package br.com.zappi.mensagem;

/**
 * Tipo da mensagem ao cliente, gravado como número em {@code mensagem_whatsapp.tipo} (RN07).
 */
public enum TipoMensagem {

	CONFIRMACAO(1),
	RECUSA(2),
	PRONTO(3);

	private final short codigo;

	TipoMensagem(int codigo) {
		this.codigo = (short) codigo;
	}

	public short getCodigo() {
		return codigo;
	}

	public static TipoMensagem deCodigo(short codigo) {
		for (TipoMensagem tipo : values()) {
			if (tipo.codigo == codigo) {
				return tipo;
			}
		}
		throw new IllegalArgumentException("Tipo de mensagem desconhecido: " + codigo);
	}

}
