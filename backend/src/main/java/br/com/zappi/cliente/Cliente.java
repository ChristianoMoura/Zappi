package br.com.zappi.cliente;

import java.time.OffsetDateTime;

import br.com.zappi.estabelecimento.Estabelecimento;
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
 * Consumidor da confeitaria. Dados pessoais protegidos pela LGPD: só é gravado com
 * consentimento (RN16), e a exclusão é por anonimização (RN17).
 */
@Entity
@Table(name = "cliente")
public class Cliente {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "estabelecimento_id", nullable = false)
	private Estabelecimento estabelecimento;

	@Column(name = "nome", nullable = false, length = 100)
	private String nome;

	@Column(name = "telefone_whatsapp", nullable = false, length = 13)
	private String telefoneWhatsapp;

	@Column(name = "consentimento_lgpd", nullable = false)
	private boolean consentimentoLgpd;

	@Column(name = "consentimento_em", nullable = false)
	private OffsetDateTime consentimentoEm;

	@Column(name = "anonimizado_em")
	private OffsetDateTime anonimizadoEm;

	@Column(name = "criado_em", nullable = false, insertable = false, updatable = false)
	private OffsetDateTime criadoEm;

	@Column(name = "atualizado_em", nullable = false)
	private OffsetDateTime atualizadoEm;

	protected Cliente() {
		// exigido pelo JPA
	}

	/** Cliente novo, sempre com o consentimento registrado (RN16, LGPD). */
	public Cliente(Estabelecimento estabelecimento, String nome, String telefoneWhatsapp, OffsetDateTime agora) {
		this.estabelecimento = estabelecimento;
		this.nome = nome;
		this.telefoneWhatsapp = telefoneWhatsapp;
		this.consentimentoLgpd = true;
		this.consentimentoEm = agora;
		this.atualizadoEm = agora;
	}

	public Long getId() {
		return id;
	}

	public Estabelecimento getEstabelecimento() {
		return estabelecimento;
	}

	public String getNome() {
		return nome;
	}

	public String getTelefoneWhatsapp() {
		return telefoneWhatsapp;
	}

	public boolean isConsentimentoLgpd() {
		return consentimentoLgpd;
	}

	public OffsetDateTime getConsentimentoEm() {
		return consentimentoEm;
	}

	public OffsetDateTime getAnonimizadoEm() {
		return anonimizadoEm;
	}

	public OffsetDateTime getCriadoEm() {
		return criadoEm;
	}

	public OffsetDateTime getAtualizadoEm() {
		return atualizadoEm;
	}

}
