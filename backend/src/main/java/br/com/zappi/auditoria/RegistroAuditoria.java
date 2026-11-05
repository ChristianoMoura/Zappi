package br.com.zappi.auditoria;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

/**
 * O que quem chama informa ao {@link ServicoAuditoria}. IP, user agent e data/hora
 * são preenchidos pelo próprio serviço.
 *
 * <pre>
 * RegistroAuditoria.de(AcaoAuditoria.PRODUTO_EDITADO)
 *     .entidade("produto", produto.getId())
 *     .estabelecimento(estabelecimentoId)
 *     .usuario(usuarioId)
 *     .detalhes(Map.of("antes", antes, "depois", depois));
 * </pre>
 */
public final class RegistroAuditoria {

	private final AcaoAuditoria acao;
	private Long estabelecimentoId;
	private Long usuarioId;
	private String entidade;
	private Long entidadeId;
	private String emailInformado;
	private Map<String, Object> detalhes;

	private RegistroAuditoria(AcaoAuditoria acao) {
		this.acao = Objects.requireNonNull(acao, "A ação de auditoria é obrigatória");
	}

	public static RegistroAuditoria de(AcaoAuditoria acao) {
		return new RegistroAuditoria(acao);
	}

	public RegistroAuditoria estabelecimento(Long estabelecimentoId) {
		this.estabelecimentoId = estabelecimentoId;
		return this;
	}

	public RegistroAuditoria usuario(Long usuarioId) {
		this.usuarioId = usuarioId;
		return this;
	}

	/** Tabela e id do registro afetado, ex.: {@code entidade("pedido", 7L)}. */
	public RegistroAuditoria entidade(String entidade, Long entidadeId) {
		this.entidade = entidade;
		this.entidadeId = entidadeId;
		return this;
	}

	/** E-mail digitado no login, inclusive quando ele não existe. */
	public RegistroAuditoria emailInformado(String emailInformado) {
		this.emailInformado = emailInformado;
		return this;
	}

	/** Gravado em JSONB, ex.: valores antes e depois da edição. */
	public RegistroAuditoria detalhes(Map<String, ?> detalhes) {
		this.detalhes = detalhes == null ? null : new LinkedHashMap<>(detalhes);
		return this;
	}

	AcaoAuditoria acao() {
		return acao;
	}

	Long estabelecimentoId() {
		return estabelecimentoId;
	}

	Long usuarioId() {
		return usuarioId;
	}

	String entidade() {
		return entidade;
	}

	Long entidadeId() {
		return entidadeId;
	}

	String emailInformado() {
		return emailInformado;
	}

	Map<String, Object> detalhes() {
		return detalhes;
	}

}
