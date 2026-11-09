package br.com.zappi.pedido;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import br.com.zappi.cliente.Cliente;

/**
 * Pedido como a tela usa (ZAP-44). O número ({@code #1}) identifica o pedido no
 * estabelecimento (RN09); o status vai como número, 1 a 5 (RN03). As datas de cada etapa
 * (RN06) vêm preenchidas só quando o pedido passou por ela.
 *
 * @param cancelado {@code true} quando o pedido recusado já tinha sido confirmado: a tela
 *        mostra "Motivo do cancelamento" (ZAP-64)
 */
public record RespostaPedido(Integer numero, int status, LocalDate dataRetirada, String observacao,
		BigDecimal valorTotal, ClienteDoPedido cliente, List<ItemDoPedido> itens, OffsetDateTime criadoEm,
		OffsetDateTime confirmadoEm, OffsetDateTime producaoEm, OffsetDateTime concluidoEm,
		OffsetDateTime recusadoEm, String motivoRecusa, boolean cancelado) {

	static RespostaPedido de(Pedido pedido, List<ItemPedido> itens) {
		boolean cancelado = pedido.getStatus() == StatusPedido.RECUSADO && pedido.getConfirmadoEm() != null;
		return new RespostaPedido(pedido.getNumero(), pedido.getStatus().getCodigo(), pedido.getDataRetirada(),
				pedido.getObservacao(), pedido.getValorTotal(), ClienteDoPedido.de(pedido.getCliente()),
				itens.stream().map(ItemDoPedido::de).toList(), pedido.getCriadoEm(), pedido.getConfirmadoEm(),
				pedido.getProducaoEm(), pedido.getConcluidoEm(), pedido.getRecusadoEm(), pedido.getMotivoRecusa(),
				cancelado);
	}

	/**
	 * Cliente do pedido. Anonimizado (RN17, LGPD), não expõe dados pessoais: o nome vem como
	 * "Cliente anonimizado" e o telefone, nulo.
	 */
	public record ClienteDoPedido(String nome, String telefone, boolean anonimizado) {

		static final String NOME_ANONIMIZADO = "Cliente anonimizado";

		static ClienteDoPedido de(Cliente cliente) {
			if (cliente.getAnonimizadoEm() != null) {
				return new ClienteDoPedido(NOME_ANONIMIZADO, null, true);
			}
			return new ClienteDoPedido(cliente.getNome(), cliente.getTelefoneWhatsapp(), false);
		}

	}

	/** Item com o preço congelado no pedido (RN10) e o subtotal (RN11). */
	public record ItemDoPedido(String produto, String sabor, String unidade, BigDecimal quantidade,
			BigDecimal precoUnitario, BigDecimal subtotal, String recheio, String cobertura, String observacao) {

		static ItemDoPedido de(ItemPedido item) {
			return new ItemDoPedido(item.getProduto().getNome(), item.getProduto().getSabor(),
					item.getProduto().getUnidadeMedida().getSigla(), item.getQuantidade(),
					item.getPrecoUnitario(), item.getSubtotal(), item.getRecheio(), item.getCobertura(),
					item.getObservacao());
		}

	}

}
