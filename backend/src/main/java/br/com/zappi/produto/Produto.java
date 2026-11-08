package br.com.zappi.produto;

import java.math.BigDecimal;
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
 * Item do cardápio (RF05/RF06). Excluir é lógico: {@code ativo = false} (RN14).
 */
@Entity
@Table(name = "produto")
public class Produto {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "estabelecimento_id", nullable = false)
	private Estabelecimento estabelecimento;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "unidade_medida_id", nullable = false)
	private UnidadeMedida unidadeMedida;

	@Column(name = "nome", nullable = false, length = 100)
	private String nome;

	@Column(name = "sabor", nullable = false, length = 100)
	private String sabor;

	@Column(name = "descricao", length = 500)
	private String descricao;

	@Column(name = "preco", nullable = false, precision = 10, scale = 2)
	private BigDecimal preco;

	@Column(name = "foto_caminho", length = 255)
	private String fotoCaminho;

	@Column(name = "foto_texto_alternativo", length = 150)
	private String fotoTextoAlternativo;

	@Column(name = "ativo", nullable = false)
	private boolean ativo;

	@Column(name = "criado_em", nullable = false, insertable = false, updatable = false)
	private OffsetDateTime criadoEm;

	@Column(name = "atualizado_em", nullable = false)
	private OffsetDateTime atualizadoEm;

	protected Produto() {
		// exigido pelo JPA
	}

	public Long getId() {
		return id;
	}

	public Estabelecimento getEstabelecimento() {
		return estabelecimento;
	}

	public UnidadeMedida getUnidadeMedida() {
		return unidadeMedida;
	}

	public String getNome() {
		return nome;
	}

	public String getSabor() {
		return sabor;
	}

	public String getDescricao() {
		return descricao;
	}

	public BigDecimal getPreco() {
		return preco;
	}

	public String getFotoCaminho() {
		return fotoCaminho;
	}

	public String getFotoTextoAlternativo() {
		return fotoTextoAlternativo;
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
