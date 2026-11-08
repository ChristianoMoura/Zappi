package br.com.zappi.pedido;

import java.math.BigDecimal;

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

	@Column(name = "recheio", length = 100)
	private String recheio;

	@Column(name = "cobertura", length = 100)
	private String cobertura;

	@Column(name = "observacao", length = 300)
	private String observacao;

	protected ItemPedido() {
		// exigido pelo JPA
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

	public String getRecheio() {
		return recheio;
	}

	public String getCobertura() {
		return cobertura;
	}

	public String getObservacao() {
		return observacao;
	}

}
