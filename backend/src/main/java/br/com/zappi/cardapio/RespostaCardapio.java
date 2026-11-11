package br.com.zappi.cardapio;

import java.math.BigDecimal;
import java.util.List;

/**
 * Cardápio público da loja (ZAP-104), com os nomes de campo que a tela do cardápio usa
 * (ZAP-105). Só dados públicos: nada de endereço, e-mail ou dados de clientes (LGPD).
 */
public record RespostaCardapio(LojaDoCardapio estabelecimento, List<ProdutoDoCardapio> produtos) {

	/**
	 * Dados da loja que aparecem no cardápio. {@code whatsapp} é o contato direto da Lídia
	 * (CDC); {@code logo} e {@code capa} são os endereços públicos das fotos, ou nulos sem foto.
	 */
	public record LojaDoCardapio(String nome, String slug, String descricao, String whatsapp, String logo,
			String capa) {
	}

	/**
	 * Produto ativo do cardápio (RN14). {@code foto} é o endereço público da imagem, sempre com
	 * o texto alternativo quando existe (RN15).
	 */
	public record ProdutoDoCardapio(Long id, String nome, String sabor, String unidade, BigDecimal preco,
			String descricao, String foto, String textoAlternativo) {
	}

}
