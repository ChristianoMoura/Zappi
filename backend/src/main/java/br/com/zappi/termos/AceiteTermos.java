package br.com.zappi.termos;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Aceite da Lídia dos Termos de uso e da Política de privacidade, gravado junto com o login
 * (ZAP-146, ISO 27002 5.34 e 8.16). Cada aceite é um registro novo, com a versão dos textos, a
 * data, o IP e o navegador, e nunca é alterado depois.
 */
@Entity
@Table(name = "aceite_termos")
public class AceiteTermos {

	/** Tamanhos das colunas {@code ip_origem} (IPv6 cabe) e {@code user_agent}, como no log. */
	static final int TAMANHO_IP = 45;

	static final int TAMANHO_USER_AGENT = 255;

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "usuario_id", nullable = false, updatable = false)
	private Long usuarioId;

	@Column(name = "versao", nullable = false, updatable = false)
	private int versao;

	@Column(name = "aceito_em", nullable = false, updatable = false)
	private OffsetDateTime aceitoEm;

	@Column(name = "ip_origem", length = TAMANHO_IP, updatable = false)
	private String ipOrigem;

	@Column(name = "user_agent", length = TAMANHO_USER_AGENT, updatable = false)
	private String userAgent;

	protected AceiteTermos() {
		// exigido pelo JPA
	}

	/** IP e navegador são cortados no tamanho das colunas: um valor longo nunca impede o login. */
	public AceiteTermos(Long usuarioId, int versao, OffsetDateTime aceitoEm, String ipOrigem, String userAgent) {
		this.usuarioId = usuarioId;
		this.versao = versao;
		this.aceitoEm = aceitoEm;
		this.ipOrigem = limitar(ipOrigem, TAMANHO_IP);
		this.userAgent = limitar(userAgent, TAMANHO_USER_AGENT);
	}

	private static String limitar(String texto, int tamanhoMaximo) {
		if (texto == null || texto.length() <= tamanhoMaximo) {
			return texto;
		}
		return texto.substring(0, tamanhoMaximo);
	}

	public Long getId() {
		return id;
	}

	public Long getUsuarioId() {
		return usuarioId;
	}

	public int getVersao() {
		return versao;
	}

	public OffsetDateTime getAceitoEm() {
		return aceitoEm;
	}

	public String getIpOrigem() {
		return ipOrigem;
	}

	public String getUserAgent() {
		return userAgent;
	}

	public TermosAceitos comoTermosAceitos() {
		return new TermosAceitos(versao, aceitoEm);
	}

}
