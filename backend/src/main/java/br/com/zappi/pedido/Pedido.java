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

	/** Tamanho de {@code motivo_recusa} no banco. */
	static final int TAMANHO_MOTIVO = 500;

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

	@Column(name = "motivo_recusa", length = TAMANHO_MOTIVO)
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

	/**
	 * Pedido novo, no status Novo (RN03), com o número sequencial do estabelecimento (RN09). O
	 * total começa em zero e é calculado quando os itens entram (RN11).
	 */
	public Pedido(Estabelecimento estabelecimento, Cliente cliente, Integer numero, LocalDate dataRetirada,
			String observacao, OffsetDateTime agora) {
		this.estabelecimento = estabelecimento;
		this.cliente = cliente;
		this.numero = numero;
		this.status = StatusPedido.NOVO;
		this.dataRetirada = dataRetirada;
		this.observacao = observacao;
		this.valorTotal = BigDecimal.ZERO;
		this.atualizadoEm = agora;
	}

	/** Só Novo, Confirmado e Em produção podem ser editados (ZAP-90). */
	public void exigirEditavel() {
		if (status == StatusPedido.CONCLUIDO || status == StatusPedido.RECUSADO) {
			throw new TransicaoNaoPermitidaException("Pedidos concluídos ou recusados não podem ser editados.");
		}
	}

	/** O cliente só pode ser trocado enquanto o pedido está Novo (ZAP-90). */
	public void exigirClienteTrocavel() {
		exigir(StatusPedido.NOVO, "O cliente não pode ser trocado depois da confirmação.");
	}

	/** Troca o cliente do pedido; só enquanto o pedido está Novo (ZAP-90). */
	public void trocarCliente(Cliente cliente, OffsetDateTime agora) {
		exigirClienteTrocavel();
		this.cliente = cliente;
		this.atualizadoEm = agora;
	}

	/** Nova data de retirada e observação (ZAP-90). */
	public void alterar(LocalDate dataRetirada, String observacao, OffsetDateTime agora) {
		this.dataRetirada = dataRetirada;
		this.observacao = observacao;
		this.atualizadoEm = agora;
	}

	/** Total = soma dos subtotais (RN11). */
	public void atualizarTotal(BigDecimal valorTotal) {
		this.valorTotal = valorTotal;
	}

	/** Novo → Confirmado, gravando {@code confirmado_em} (RN03, RN06). Só pedidos Novos. */
	public void confirmar(OffsetDateTime agora) {
		if (status != StatusPedido.NOVO) {
			throw new TransicaoNaoPermitidaException("Só pedidos novos podem ser confirmados.");
		}
		this.status = StatusPedido.CONFIRMADO;
		this.confirmadoEm = agora;
		this.atualizadoEm = agora;
	}

	/** Confirmado → Em produção, gravando {@code producao_em} (RN06, ZAP-83). */
	public void iniciarProducao(OffsetDateTime agora) {
		exigir(StatusPedido.CONFIRMADO, "Só pedidos confirmados podem entrar em produção.");
		this.status = StatusPedido.EM_PRODUCAO;
		this.producaoEm = agora;
		this.atualizadoEm = agora;
	}

	/** Volta de Em produção para Confirmado, apagando {@code producao_em} (RN06, ZAP-64). */
	public void voltarParaConfirmado(OffsetDateTime agora) {
		exigir(StatusPedido.EM_PRODUCAO, "Só pedidos em produção podem voltar para confirmado.");
		this.status = StatusPedido.CONFIRMADO;
		this.producaoEm = null;
		this.atualizadoEm = agora;
	}

	/**
	 * Volta de Concluído para Em produção, apagando {@code concluido_em} e mantendo
	 * {@code producao_em} (RN06, ZAP-64).
	 */
	public void voltarParaProducao(OffsetDateTime agora) {
		exigir(StatusPedido.CONCLUIDO, "Só pedidos concluídos podem voltar para produção.");
		// Cliente anonimizado nunca tem pedido em aberto (RN17): sem nome nem WhatsApp, o aviso
		// de pronto não teria para quem ir
		if (cliente.getAnonimizadoEm() != null) {
			throw new TransicaoNaoPermitidaException(
					"Os dados deste cliente foram apagados. O pedido não pode voltar para a produção.");
		}
		this.status = StatusPedido.EM_PRODUCAO;
		this.concluidoEm = null;
		this.atualizadoEm = agora;
	}

	/** Em produção → Concluído, gravando {@code concluido_em} (RN06, ZAP-76). */
	public void concluir(OffsetDateTime agora) {
		exigir(StatusPedido.EM_PRODUCAO, "Só pedidos em produção podem ser concluídos.");
		this.status = StatusPedido.CONCLUIDO;
		this.concluidoEm = agora;
		this.atualizadoEm = agora;
	}

	private void exigir(StatusPedido origem, String mensagem) {
		if (status != origem) {
			throw new TransicaoNaoPermitidaException(mensagem);
		}
	}

	/**
	 * Recusa (Novo) ou cancela (Confirmado ou Em produção) o pedido, com o motivo obrigatório,
	 * gravando {@code recusado_em} (RN03, RN05, RN06, ZAP-64). Concluído e Recusado não mudam.
	 */
	public void recusar(String motivo, OffsetDateTime agora) {
		if (status == StatusPedido.CONCLUIDO || status == StatusPedido.RECUSADO) {
			throw new TransicaoNaoPermitidaException(
					"Pedidos concluídos ou já recusados não podem ser recusados nem cancelados.");
		}
		this.status = StatusPedido.RECUSADO;
		this.motivoRecusa = motivo;
		this.recusadoEm = agora;
		this.atualizadoEm = agora;
	}

	/**
	 * O cliente foi anonimizado (RN17): o motivo da recusa é trocado pelo texto já sem o nome e
	 * o telefone, cortado no tamanho da coluna, porque "Cliente anonimizado" é mais longo que
	 * o nome. Só os pedidos recusados têm motivo; os outros não mudam.
	 */
	public void substituirMotivoRecusa(String motivo, OffsetDateTime agora) {
		if (this.motivoRecusa == null || this.motivoRecusa.equals(motivo)) {
			return;
		}
		this.motivoRecusa = motivo.length() > TAMANHO_MOTIVO ? motivo.substring(0, TAMANHO_MOTIVO) : motivo;
		this.atualizadoEm = agora;
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
