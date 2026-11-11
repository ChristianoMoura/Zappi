package br.com.zappi.cliente;

/**
 * O cliente tem pedido Novo, Confirmado ou Em produção, e por isso não pode ser anonimizado
 * (RN17): a Lídia ainda precisa do nome e do WhatsApp para atender o pedido. A API responde
 * 409, e nada é gravado.
 */
public class ClienteComPedidoEmAbertoException extends RuntimeException {

	private static final long serialVersionUID = 1L;

	public ClienteComPedidoEmAbertoException() {
		super("Este cliente ainda tem pedido em andamento (Novo, Confirmado ou Em produção). "
				+ "Conclua ou recuse esses pedidos antes de apagar os dados dele.");
	}

}
