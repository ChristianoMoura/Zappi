package br.com.zappi.produto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import br.com.zappi.categoria.Categoria;
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

	/** Obrigatória e da mesma loja (ZAP-136); define a ordem das listas. */
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "categoria_id", nullable = false)
	private Categoria categoria;

	/** Nome completo, ex.: "Bolo de brigadeiro de chocolate". Não há mais o campo sabor (ZAP-136). */
	@Column(name = "nome", nullable = false, length = 150)
	private String nome;

	@Column(name = "descricao", length = 500)
	private String descricao;

	@Column(name = "preco", nullable = false, precision = 10, scale = 2)
	private BigDecimal preco;

	@Column(name = "foto_caminho", length = 255)
	private String fotoCaminho;

	@Column(name = "foto_texto_alternativo", length = 150)
	private String fotoTextoAlternativo;

	/** Nulo é "não informado": nunca vira "não contém glúten" sem a Lídia ter dito (ZAP-128). */
	@Column(name = "contem_gluten")
	private Boolean contemGluten;

	@Column(name = "outros_alergenos", length = 300)
	private String outrosAlergenos;

	@Column(name = "ativo", nullable = false)
	private boolean ativo;

	/**
	 * Fora do cardápio por um tempo, sem excluir (ZAP-151): continua na tela de produtos do
	 * painel, mas não aparece no cardápio público nem entra em pedido novo. Separado de
	 * {@code ativo}, que é a exclusão (RN14).
	 */
	@Column(name = "no_cardapio", nullable = false)
	private boolean noCardapio;

	@Column(name = "criado_em", nullable = false, insertable = false, updatable = false)
	private OffsetDateTime criadoEm;

	@Column(name = "atualizado_em", nullable = false)
	private OffsetDateTime atualizadoEm;

	protected Produto() {
		// exigido pelo JPA
	}

	/** Produto novo, já ativo no cardápio (ZAP-39). */
	public Produto(Estabelecimento estabelecimento, Categoria categoria, UnidadeMedida unidadeMedida, String nome,
			String descricao, BigDecimal preco, String fotoTextoAlternativo, Boolean contemGluten,
			String outrosAlergenos, OffsetDateTime agora) {
		this.estabelecimento = estabelecimento;
		this.ativo = true;
		this.noCardapio = true;
		atualizar(categoria, unidadeMedida, nome, descricao, preco, fotoTextoAlternativo, contemGluten, outrosAlergenos,
				agora);
	}

	/**
	 * Troca os dados do produto. Os pedidos antigos não mudam: o item do pedido guarda o
	 * preço congelado (RN10).
	 */
	public void atualizar(Categoria categoria, UnidadeMedida unidadeMedida, String nome, String descricao,
			BigDecimal preco, String fotoTextoAlternativo, Boolean contemGluten, String outrosAlergenos,
			OffsetDateTime agora) {
		this.categoria = categoria;
		this.unidadeMedida = unidadeMedida;
		this.nome = nome;
		this.descricao = descricao;
		this.preco = preco;
		this.fotoTextoAlternativo = fotoTextoAlternativo;
		this.contemGluten = contemGluten;
		this.outrosAlergenos = outrosAlergenos;
		this.atualizadoEm = agora;
	}

	/** Exclusão lógica (RN14): some do cardápio, mas continua nos pedidos antigos. */
	public void excluir(OffsetDateTime agora) {
		this.ativo = false;
		this.atualizadoEm = agora;
	}

	/**
	 * Tira do cardápio (ZAP-151) ou volta com ele. Devolve {@code false} quando o produto já
	 * estava assim, sem mudar nada.
	 */
	public boolean colocarNoCardapio(boolean noCardapio, OffsetDateTime agora) {
		if (this.noCardapio == noCardapio) {
			return false;
		}
		this.noCardapio = noCardapio;
		this.atualizadoEm = agora;
		return true;
	}

	/** Foto nova, sempre com o texto alternativo (RN15, ZAP-40). */
	public void trocarFoto(String caminho, String textoAlternativo, OffsetDateTime agora) {
		this.fotoCaminho = caminho;
		this.fotoTextoAlternativo = textoAlternativo;
		this.atualizadoEm = agora;
	}

	/** Tira a foto; o texto alternativo sai junto. */
	public void removerFoto(OffsetDateTime agora) {
		this.fotoCaminho = null;
		this.fotoTextoAlternativo = null;
		this.atualizadoEm = agora;
	}

	/** Com foto, o texto alternativo é obrigatório (RN15, NBR 17225 5.9.1). */
	public boolean temFoto() {
		return fotoCaminho != null;
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

	public Categoria getCategoria() {
		return categoria;
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

	/** Nulo quando a Lídia ainda não informou (produto anterior à ZAP-128). */
	public Boolean getContemGluten() {
		return contemGluten;
	}

	public String getOutrosAlergenos() {
		return outrosAlergenos;
	}

	public boolean isAtivo() {
		return ativo;
	}

	public boolean isNoCardapio() {
		return noCardapio;
	}

	public OffsetDateTime getCriadoEm() {
		return criadoEm;
	}

	public OffsetDateTime getAtualizadoEm() {
		return atualizadoEm;
	}

}
