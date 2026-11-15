package br.com.zappi.categoria;

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
 * Categoria do cardápio (ZAP-136), na ordem definida pela Lídia. Excluir é lógico, como no
 * produto: {@code ativo = false} (RN14). O nome não se repete entre as ativas da loja.
 */
@Entity
@Table(name = "categoria")
public class Categoria {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "estabelecimento_id", nullable = false)
	private Estabelecimento estabelecimento;

	@Column(name = "nome", nullable = false, length = 60)
	private String nome;

	@Column(name = "ordem", nullable = false)
	private int ordem;

	@Column(name = "ativo", nullable = false)
	private boolean ativo;

	@Column(name = "criado_em", nullable = false, insertable = false, updatable = false)
	private OffsetDateTime criadoEm;

	@Column(name = "atualizado_em", nullable = false)
	private OffsetDateTime atualizadoEm;

	protected Categoria() {
		// exigido pelo JPA
	}

	/** Categoria nova, ativa, na posição informada (o fim da lista). */
	public Categoria(Estabelecimento estabelecimento, String nome, int ordem, OffsetDateTime agora) {
		this.estabelecimento = estabelecimento;
		this.nome = nome;
		this.ordem = ordem;
		this.ativo = true;
		this.atualizadoEm = agora;
	}

	public void renomear(String nome, OffsetDateTime agora) {
		this.nome = nome;
		this.atualizadoEm = agora;
	}

	/** Muda a posição; sem mudança, não mexe no {@code atualizado_em}. */
	public void mudarOrdem(int ordem, OffsetDateTime agora) {
		if (this.ordem != ordem) {
			this.ordem = ordem;
			this.atualizadoEm = agora;
		}
	}

	/** Exclusão lógica (RN14). Só é chamada sem produto na categoria. */
	public void excluir(OffsetDateTime agora) {
		this.ativo = false;
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

	public int getOrdem() {
		return ordem;
	}

	public boolean isAtivo() {
		return ativo;
	}

	public OffsetDateTime getCriadoEm() {
		return criadoEm;
	}

	public OffsetDateTime getAtualizadoEm() {
		return atualizadoEm;
	}

}
