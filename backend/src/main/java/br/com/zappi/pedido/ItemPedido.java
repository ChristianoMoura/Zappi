package br.com.zappi.pedido;

import java.math.BigDecimal;
import java.math.RoundingMode;

import br.com.zappi.produto.Produto;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Produto do pedido. O preço fica congelado quando o item entra no pedido (RN10), e
 * {@code subtotal = quantidade × preco_unitario} (RN11).
 */
@Entity
@Table(name = "item_pedido")
public class ItemPedido {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "pedido_id", nullable = false)
	private Pedido pedido;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "produto_id", nullable = false)
	private Produto produto;

	@Column(name = "quantidade", nullable = false, precision = 8, scale = 3)
	private BigDecimal quantidade;

	@Column(name = "preco_unitario", nullable = false, precision = 10, scale = 2)
	private BigDecimal precoUnitario;

	@Column(name = "subtotal", nullable = false, precision = 10, scale = 2)
	private BigDecimal subtotal;

	/**
	 * Detalhes do item, em todos os produtos. Sem recheio e cobertura desde a ZAP-136: os dos
	 * pedidos antigos foram copiados para cá, por isso a coluna tem 600 caracteres; item novo
	 * aceita até 300.
	 */
	@Column(name = "observacao", length = 600)
	private String observacao;

	protected ItemPedido() {
		// exigido pelo JPA
	}

	/** Item novo, com o preço congelado no momento em que entra no pedido (RN10). */
	public ItemPedido(Pedido pedido, Produto produto, BigDecimal precoUnitario, BigDecimal quantidade,
			String observacao) {
		this.pedido = pedido;
		this.produto = produto;
		this.precoUnitario = precoUnitario;
		aplicar(quantidade, observacao);
	}

	/** Muda a quantidade e a observação; o preço congelado continua o mesmo (RN10). */
	public void atualizar(BigDecimal quantidade, String observacao) {
		aplicar(quantidade, observacao);
	}

	private void aplicar(BigDecimal quantidade, String observacao) {
		// 3 casas, como a coluna (RN12); a validação já barrou mais casas que isso
		this.quantidade = quantidade.setScale(3, RoundingMode.HALF_UP);
		this.observacao = observacao;
		// subtotal = quantidade × preço congelado, em centavos (RN11)
		this.subtotal = this.quantidade.multiply(precoUnitario).setScale(2, RoundingMode.HALF_UP);
	}

	public Long getId() {
		return id;
	}

	public Pedido getPedido() {
		return pedido;
	}

	public Produto getProduto() {
		return produto;
	}

	public BigDecimal getQuantidade() {
		return quantidade;
	}

	public BigDecimal getPrecoUnitario() {
		return precoUnitario;
	}

	public BigDecimal getSubtotal() {
		return subtotal;
	}

	public String getObservacao() {
		return observacao;
	}

}
