package br.com.zappi.notificacao;

/**
 * Tipo da notificação, gravado como número em {@code notificacao.tipo} (ZAP-172).
 */
public enum TipoNotificacao {

	/** O pedido chegou pelo Portal do Cliente. */
	NOVO_PEDIDO(1),
	/** A retirada do pedido está perto (ver {@link MomentoNotificacao}). */
	RETIRADA_PROXIMA(2);

	private final short codigo;

	TipoNotificacao(int codigo) {
		this.codigo = (short) codigo;
	}

	public short getCodigo() {
		return codigo;
	}

	public static TipoNotificacao deCodigo(short codigo) {
		for (TipoNotificacao tipo : values()) {
			if (tipo.codigo == codigo) {
				return tipo;
			}
		}
		throw new IllegalArgumentException("Tipo de notificação desconhecido: " + codigo);
	}

}
