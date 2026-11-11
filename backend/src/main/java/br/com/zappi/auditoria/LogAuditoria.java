package br.com.zappi.auditoria;

import java.time.OffsetDateTime;
import java.util.Map;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Registro da trilha de auditoria (tabela {@code log_auditoria}, seção 13 do context.md).
 *
 * A tabela é criada pelas migrações do Flyway (ZAP-72). Os ids de estabelecimento e
 * usuário ficam nulos em falha de login com e-mail inexistente.
 */
@Entity
@Table(name = "log_auditoria")
public class LogAuditoria {

	static final int TAMANHO_ENTIDADE = 40;
	static final int TAMANHO_EMAIL = 150;
	static final int TAMANHO_IP = 45;
	static final int TAMANHO_USER_AGENT = 255;

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "estabelecimento_id")
	private Long estabelecimentoId;

	@Column(name = "usuario_id")
	private Long usuarioId;

	@Enumerated(EnumType.STRING)
	@Column(name = "acao", nullable = false, length = 40)
	private AcaoAuditoria acao;

	@Column(name = "entidade", length = TAMANHO_ENTIDADE)
	private String entidade;

	@Column(name = "entidade_id")
	private Long entidadeId;

	@Column(name = "email_informado", length = TAMANHO_EMAIL)
	private String emailInformado;

	@Column(name = "ip_origem", length = TAMANHO_IP)
	private String ipOrigem;

	@Column(name = "user_agent", length = TAMANHO_USER_AGENT)
	private String userAgent;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "detalhes", columnDefinition = "jsonb")
	private Map<String, Object> detalhes;

	@Column(name = "criado_em", nullable = false)
	private OffsetDateTime criadoEm;

	protected LogAuditoria() {
		// exigido pelo JPA
	}

	LogAuditoria(AcaoAuditoria acao, Long estabelecimentoId, Long usuarioId, String entidade, Long entidadeId,
			String emailInformado, String ipOrigem, String userAgent, Map<String, Object> detalhes,
			OffsetDateTime criadoEm) {
		this.acao = acao;
		this.estabelecimentoId = estabelecimentoId;
		this.usuarioId = usuarioId;
		this.entidade = entidade;
		this.entidadeId = entidadeId;
		this.emailInformado = emailInformado;
		this.ipOrigem = ipOrigem;
		this.userAgent = userAgent;
		this.detalhes = detalhes;
		this.criadoEm = criadoEm;
	}

	/**
	 * Troca os detalhes ao anonimizar um cliente (RN17): o registro continua, só sem os dados
	 * pessoais.
	 */
	void substituirDetalhes(Map<String, Object> detalhes) {
		this.detalhes = detalhes;
	}

	public Long getId() {
		return id;
	}

	public Long getEstabelecimentoId() {
		return estabelecimentoId;
	}

	public Long getUsuarioId() {
		return usuarioId;
	}

	public AcaoAuditoria getAcao() {
		return acao;
	}

	public String getEntidade() {
		return entidade;
	}

	public Long getEntidadeId() {
		return entidadeId;
	}

	public String getEmailInformado() {
		return emailInformado;
	}

	public String getIpOrigem() {
		return ipOrigem;
	}

	public String getUserAgent() {
		return userAgent;
	}

	public Map<String, Object> getDetalhes() {
		return detalhes;
	}

	public OffsetDateTime getCriadoEm() {
		return criadoEm;
	}

}
