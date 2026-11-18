package br.com.zappi.estabelecimento;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import br.com.zappi.pagamento.FormaPagamento;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Confeitaria cadastrada (tenant), ex.: Casa Belt. Todo dado de negócio pertence a um
 * estabelecimento (RN01).
 */
@Entity
@Table(name = "estabelecimento")
public class Estabelecimento {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "nome", nullable = false, length = 100)
	private String nome;

	@Column(name = "slug", nullable = false, length = 60)
	private String slug;

	@Column(name = "descricao", length = 500)
	private String descricao;

	@Column(name = "telefone_whatsapp", nullable = false, length = 13)
	private String telefoneWhatsapp;

	@Column(name = "email_contato", length = 150)
	private String emailContato;

	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(name = "cep", length = 8)
	private String cep;

	@Column(name = "logradouro", length = 150)
	private String logradouro;

	@Column(name = "numero", length = 10)
	private String numero;

	@Column(name = "complemento", length = 60)
	private String complemento;

	@Column(name = "bairro", length = 80)
	private String bairro;

	@Column(name = "cidade", length = 80)
	private String cidade;

	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(name = "uf", length = 2)
	private String uf;

	/** Caminho do logo no bucket {@code estabelecimentos} (ZAP-119). */
	@Column(name = "logo_caminho", length = 255)
	private String logoCaminho;

	/** Caminho da foto de capa no bucket {@code estabelecimentos} (ZAP-119). */
	@Column(name = "capa_caminho", length = 255)
	private String capaCaminho;

	/**
	 * Mostrar a seção "Promoções" no topo do cardápio público (ZAP-152). Ligado por padrão;
	 * desligado, o selo e o preço riscado continuam nos produtos.
	 */
	@Column(name = "destacar_promocoes", nullable = false)
	private boolean destacarPromocoes;

	/**
	 * Formas de pagamento aceitas ({@link FormaPagamento}), sem repetir e na ordem da lista, com
	 * pelo menos uma (ZAP-190). Todas por padrão (V13).
	 */
	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(name = "formas_pagamento", nullable = false)
	private List<String> formasPagamento = new ArrayList<>(FormaPagamento.todas());

	@Column(name = "ativo", nullable = false)
	private boolean ativo;

	@Column(name = "criado_em", nullable = false, insertable = false, updatable = false)
	private OffsetDateTime criadoEm;

	@Column(name = "atualizado_em", nullable = false)
	private OffsetDateTime atualizadoEm;

	protected Estabelecimento() {
		// exigido pelo JPA
	}

	/**
	 * Troca os dados que a Lídia edita na tela "Estabelecimento" (RF04). {@code ativo} e
	 * {@code criado_em} não mudam por aqui. {@code formasPagamento} já vem conferida e na ordem
	 * da lista; nula, as formas continuam como estavam (ZAP-190).
	 */
	void atualizar(RequisicaoEstabelecimento dados, List<String> formasPagamento, OffsetDateTime agora) {
		this.nome = dados.nome();
		this.slug = dados.slug();
		this.descricao = dados.descricao();
		this.telefoneWhatsapp = dados.whatsapp();
		this.emailContato = dados.emailContato();
		this.cep = dados.cep();
		this.logradouro = dados.logradouro();
		this.numero = dados.numero();
		this.complemento = dados.complemento();
		this.bairro = dados.bairro();
		this.cidade = dados.cidade();
		this.uf = dados.uf();
		if (dados.destacarPromocoes() != null) {
			this.destacarPromocoes = dados.destacarPromocoes();
		}
		if (formasPagamento != null) {
			this.formasPagamento = new ArrayList<>(formasPagamento);
		}
		this.atualizadoEm = agora;
	}

	/** Troca ou tira (com {@code null}) o logo da loja (ZAP-119). */
	void trocarLogo(String caminho, OffsetDateTime agora) {
		this.logoCaminho = caminho;
		this.atualizadoEm = agora;
	}

	/** Troca ou tira (com {@code null}) a foto de capa da loja (ZAP-119). */
	void trocarCapa(String caminho, OffsetDateTime agora) {
		this.capaCaminho = caminho;
		this.atualizadoEm = agora;
	}

	public String getLogoCaminho() {
		return logoCaminho;
	}

	public String getCapaCaminho() {
		return capaCaminho;
	}

	public Long getId() {
		return id;
	}

	public String getNome() {
		return nome;
	}

	public String getSlug() {
		return slug;
	}

	public String getDescricao() {
		return descricao;
	}

	public String getTelefoneWhatsapp() {
		return telefoneWhatsapp;
	}

	public String getEmailContato() {
		return emailContato;
	}

	public String getCep() {
		return cep;
	}

	public String getLogradouro() {
		return logradouro;
	}

	public String getNumero() {
		return numero;
	}

	public String getComplemento() {
		return complemento;
	}

	public String getBairro() {
		return bairro;
	}

	public String getCidade() {
		return cidade;
	}

	public String getUf() {
		return uf;
	}

	public boolean isDestacarPromocoes() {
		return destacarPromocoes;
	}

	/** Códigos das formas aceitas, na ordem da lista (ZAP-190). */
	public List<String> getFormasPagamento() {
		return formasPagamento == null ? List.of() : List.copyOf(formasPagamento);
	}

	/** Se a loja aceita a forma agora (ZAP-190): vale para o pedido novo. */
	public boolean aceita(FormaPagamento forma) {
		return getFormasPagamento().contains(forma.name());
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
