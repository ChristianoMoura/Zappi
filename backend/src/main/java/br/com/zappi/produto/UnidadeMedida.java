package br.com.zappi.produto;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Tabela de domínio com valores fixos, criados pela migração: 1-KG (aceita fração) e
 * 2-UN (não aceita fração, RN12).
 */
@Entity
@Table(name = "unidade_medida")
public class UnidadeMedida {

	public static final short QUILOGRAMA = 1;
	public static final short UNIDADE = 2;

	@Id
	private Short id;

	@Column(name = "sigla", nullable = false, length = 5)
	private String sigla;

	@Column(name = "descricao", nullable = false, length = 30)
	private String descricao;

	@Column(name = "permite_fracao", nullable = false)
	private boolean permiteFracao;

	protected UnidadeMedida() {
		// exigido pelo JPA
	}

	public Short getId() {
		return id;
	}

	public String getSigla() {
		return sigla;
	}

	public String getDescricao() {
		return descricao;
	}

	public boolean isPermiteFracao() {
		return permiteFracao;
	}

}
