package br.com.zappi.cardapio;

import java.math.BigDecimal;
import java.util.List;

import br.com.zappi.categoria.RespostaCategoria;

/**
 * Cardápio público da loja (ZAP-104), com os nomes de campo que a tela do cardápio usa
 * (ZAP-105). Só dados públicos: nada de endereço, e-mail ou dados de clientes (LGPD).
 *
 * <p>{@code categorias} vem na ordem definida pela Lídia, só com as que têm produto no cardápio,
 * e os produtos vêm na mesma ordem: categoria, nome e id (ZAP-136, ZAP-140).
 */
public record RespostaCardapio(LojaDoCardapio estabelecimento, List<RespostaCategoria> categorias,
		List<ProdutoDoCardapio> produtos) {

	/**
	 * Dados da loja que aparecem no cardápio. {@code whatsapp} é o contato direto da Lídia
	 * (CDC); {@code logo} e {@code capa} são os endereços públicos das fotos, ou nulos sem foto.
	 * {@code destacarPromocoes} diz se a seção "Promoções" aparece no topo do cardápio (ZAP-152).
	 */
	public record LojaDoCardapio(String nome, String slug, String descricao, String whatsapp, String logo,
			String capa, boolean destacarPromocoes) {
	}

	/**
	 * Produto ativo do cardápio (RN14). {@code foto} é o endereço público da imagem, sempre com
	 * o texto alternativo quando existe (RN15). O nome é o nome completo (ZAP-136). {@code preco}
	 * é o preço normal, e {@code precoPromocional} o com desconto, ou nulo sem promoção (ZAP-152).
	 * {@code alergenos} são os códigos da lista fixa, na ordem dela, e {@code outrosAlergenos} o
	 * texto livre, ou nulo, para os selos do cardápio (ZAP-197).
	 */
	public record ProdutoDoCardapio(Long id, String nome, RespostaCategoria categoria, String unidade, BigDecimal preco,
			BigDecimal precoPromocional, String descricao, String foto, String textoAlternativo, List<String> alergenos,
			String outrosAlergenos) {
	}

}
