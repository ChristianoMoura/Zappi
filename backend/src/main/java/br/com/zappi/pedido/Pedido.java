package br.com.zappi.pedido;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

import br.com.zappi.cliente.Cliente;
import br.com.zappi.estabelecimento.Estabelecimento;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Encomenda: cada pedido é um card do Kanban (RF07–RF16). O número é sequencial por
 * estabelecimento (RN09), e o banco garante que o cliente é do mesmo estabelecimento
 * do pedido (FK composta, ZAP-64).
 */
@Entity
@Table(name = "pedido")
public class Pedido {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "estabelecimento_id", nullable = false)
	private Estabelecimento estabelecimento;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "cliente_id", nullable = false)
	private Cliente cliente;

	@Column(name = "numero", nullable = false)
	private Integer numero;

	@Convert(converter = ConversorStatusPedido.class)
	@Column(name = "status", nullable = false)
	private StatusPedido status;

	@Column(name = "data_retirada", nullable = false)
	private LocalDate dataRetirada;

	@Column(name = "observacao", length = 500)
	private String observacao;

	@Column(name = "motivo_recusa", length = 500)
	private String motivoRecusa;

	@Column(name = "valor_total", nullable = false, precision = 10, scale = 2)
	private BigDecimal valorTotal;

	@Column(name = "criado_em", nullable = false, insertable = false, updatable = false)
	private OffsetDateTime criadoEm;

	@Column(name = "confirmado_em")
	private OffsetDateTime confirmadoEm;

	@Column(name = "producao_em")
	private OffsetDateTime producaoEm;

	@Column(name = "recusado_em")
	private OffsetDateTime recusadoEm;

	@Column(name = "concluido_em")
	private OffsetDateTime concluidoEm;

	@Column(name = "atualizado_em", nullable = false)
	private OffsetDateTime atualizadoEm;

	protected Pedido() {
		// exigido pelo JPA
	}

	public Long getId() {
		return id;
	}

	public Estabelecimento getEstabelecimento() {
		return estabelecimento;
	}

	public Cliente getCliente() {
		return cliente;
	}

	public Integer getNumero() {
		return numero;
	}

	public StatusPedido getStatus() {
		return status;
	}

	public LocalDate getDataRetirada() {
		return dataRetirada;
	}

	public String getObservacao() {
		return observacao;
	}

	public String getMotivoRecusa() {
		return motivoRecusa;
	}

	public BigDecimal getValorTotal() {
		return valorTotal;
	}

	public OffsetDateTime getCriadoEm() {
		return criadoEm;
	}

	public OffsetDateTime getConfirmadoEm() {
		return confirmadoEm;
	}

	public OffsetDateTime getProducaoEm() {
		return producaoEm;
	}

	public OffsetDateTime getRecusadoEm() {
		return recusadoEm;
	}

	public OffsetDateTime getConcluidoEm() {
		return concluidoEm;
	}

	public OffsetDateTime getAtualizadoEm() {
		return atualizadoEm;
	}

}
