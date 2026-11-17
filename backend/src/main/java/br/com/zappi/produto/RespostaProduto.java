package br.com.zappi.produto;

import java.math.BigDecimal;
import java.util.List;

import br.com.zappi.armazenamento.ArmazenamentoDeFotos;
import br.com.zappi.categoria.RespostaCategoria;

/**
 * Produto como a tela usa. {@code foto} é o endereço público da imagem no Supabase Storage
 * (ZAP-40), ou nulo quando o produto não tem foto. {@code alergenos} são os códigos da lista
 * fixa, na ordem dela, e vazia sem alérgeno da lista (ZAP-197). O nome é o nome completo, e a
 * categoria vem com id e nome (ZAP-136). {@code noCardapio} falso é o produto fora do cardápio
 * por um tempo, que só aparece no painel (ZAP-151). {@code preco} é sempre o preço normal, e
 * {@code precoPromocional} é o preço com desconto, ou nulo sem promoção (ZAP-152).
 */
public record RespostaProduto(Long id, String nome, RespostaCategoria categoria, String unidade, BigDecimal preco,
		BigDecimal precoPromocional, String descricao, String foto, String textoAlternativo, List<String> alergenos,
		String outrosAlergenos, boolean ativo, boolean noCardapio) {

	static RespostaProduto de(Produto produto, ArmazenamentoDeFotos armazenamento) {
		return new RespostaProduto(produto.getId(), produto.getNome(),
				RespostaCategoria.de(produto.getCategoria()),
				produto.getUnidadeMedida().getSigla(), produto.getPreco(), produto.getPrecoPromocional(),
				produto.getDescricao(),
				armazenamento.enderecoPublico(produto.getFotoCaminho()), produto.getFotoTextoAlternativo(),
				produto.getAlergenos(), produto.getOutrosAlergenos(), produto.isAtivo(),
				produto.isNoCardapio());
	}

}
