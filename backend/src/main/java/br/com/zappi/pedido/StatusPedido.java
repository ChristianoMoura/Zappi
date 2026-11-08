package br.com.zappi.pedido;

/**
 * Status do pedido, gravado como número em {@code pedido.status} (RN03).
 */
public enum StatusPedido {

	NOVO(1),
	CONFIRMADO(2),
	EM_PRODUCAO(3),
	CONCLUIDO(4),
	RECUSADO(5);

	private final short codigo;

	StatusPedido(int codigo) {
		this.codigo = (short) codigo;
	}

	public short getCodigo() {
		return codigo;
	}

	public static StatusPedido deCodigo(short codigo) {
		for (StatusPedido status : values()) {
			if (status.codigo == codigo) {
				return status;
			}
		}
		throw new IllegalArgumentException("Status de pedido desconhecido: " + codigo);
	}

}
