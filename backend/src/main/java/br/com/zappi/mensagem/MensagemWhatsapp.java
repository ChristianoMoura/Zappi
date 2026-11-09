package br.com.zappi.mensagem;

import java.time.OffsetDateTime;

import br.com.zappi.pedido.Pedido;
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
 * Mensagem ao cliente gerada a cada decisão sobre o pedido (RN07). No MVP, a Lídia
 * envia pelo link {@code wa.me}; {@code id_externo} fica reservado para a Cloud API.
 */
@Entity
@Table(name = "mensagem_whatsapp")
public class MensagemWhatsapp {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "pedido_id", nullable = false)
	private Pedido pedido;

	@Convert(converter = ConversorTipoMensagem.class)
	@Column(name = "tipo", nullable = false)
	private TipoMensagem tipo;

	/** Cópia do telefone do cliente no momento em que a mensagem foi gerada (RN20). */
	@Column(name = "telefone_destino", nullable = false, length = 13)
	private String telefoneDestino;

	@Column(name = "conteudo", nullable = false, columnDefinition = "text")
	private String conteudo;

	@Convert(converter = ConversorStatusMensagem.class)
	@Column(name = "status", nullable = false)
	private StatusMensagem status;

	@Column(name = "id_externo", length = 100)
	private String idExterno;

	@Column(name = "criado_em", nullable = false, insertable = false, updatable = false)
	private OffsetDateTime criadoEm;

	@Column(name = "enviado_em")
	private OffsetDateTime enviadoEm;

	protected MensagemWhatsapp() {
		// exigido pelo JPA
	}

	/**
	 * Mensagem nova, Pendente até a Lídia enviar (RN07). O telefone é copiado do cliente no
	 * momento em que a mensagem é gerada (RN20).
	 */
	public MensagemWhatsapp(Pedido pedido, TipoMensagem tipo, String telefoneDestino, String conteudo) {
		this.pedido = pedido;
		this.tipo = tipo;
		this.telefoneDestino = telefoneDestino;
		this.conteudo = conteudo;
		this.status = StatusMensagem.PENDENTE;
	}

	/**
	 * A Lídia clicou em "Enviar no WhatsApp" (ZAP-50). Reenviar não muda nada: a data continua
	 * a do primeiro envio (ZAP-64).
	 */
	public void marcarEnviada(OffsetDateTime agora) {
		this.status = StatusMensagem.ENVIADA;
		if (this.enviadoEm == null) {
			this.enviadoEm = agora;
		}
	}

	public Long getId() {
		return id;
	}

	public Pedido getPedido() {
		return pedido;
	}

	public TipoMensagem getTipo() {
		return tipo;
	}

	public String getTelefoneDestino() {
		return telefoneDestino;
	}

	public String getConteudo() {
		return conteudo;
	}

	public StatusMensagem getStatus() {
		return status;
	}

	public String getIdExterno() {
		return idExterno;
	}

	public OffsetDateTime getCriadoEm() {
		return criadoEm;
	}

	public OffsetDateTime getEnviadoEm() {
		return enviadoEm;
	}

}
