package br.com.zappi.notificacao;

import java.time.OffsetDateTime;

import br.com.zappi.pedido.Pedido;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Aviso para a Lídia sobre um pedido, mostrado no sino do painel (ZAP-172). Não guarda texto
 * nem dado pessoal: o texto é montado na leitura, a partir do pedido (RN17). As linhas são
 * gravadas pelo {@link NotificacaoRepositorio}, sem repetir o mesmo aviso; aqui só se lê.
 */
@Entity
@Table(name = "notificacao")
public class Notificacao {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "estabelecimento_id", nullable = false)
	private Long estabelecimentoId;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "pedido_id", nullable = false)
	private Pedido pedido;

	@Convert(converter = ConversorTipoNotificacao.class)
	@Column(name = "tipo", nullable = false)
	private TipoNotificacao tipo;

	/** Nulo no novo pedido; um dos três momentos na retirada próxima. */
	@Enumerated(EnumType.STRING)
	@Column(name = "momento", length = 20)
	private MomentoNotificacao momento;

	@Column(name = "criado_em", nullable = false, insertable = false, updatable = false)
	private OffsetDateTime criadoEm;

	/** Nula enquanto a Lídia não abriu a caixinha com a notificação. */
	@Column(name = "vista_em")
	private OffsetDateTime vistaEm;

	protected Notificacao() {
		// exigido pelo JPA
	}

	public Long getId() {
		return id;
	}

	public Long getEstabelecimentoId() {
		return estabelecimentoId;
	}

	public Pedido getPedido() {
		return pedido;
	}

	public TipoNotificacao getTipo() {
		return tipo;
	}

	public MomentoNotificacao getMomento() {
		return momento;
	}

	public OffsetDateTime getCriadoEm() {
		return criadoEm;
	}

	public OffsetDateTime getVistaEm() {
		return vistaEm;
	}

	public boolean isVista() {
		return vistaEm != null;
	}

}
