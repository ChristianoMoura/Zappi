package br.com.zappi.produto;

import java.math.BigDecimal;

import br.com.zappi.armazenamento.ArmazenamentoDeFotos;

/**
 * Produto como a tela usa. {@code foto} é o endereço público da imagem no Supabase Storage
 * (ZAP-40), ou nulo quando o produto não tem foto. {@code contemGluten} nulo é "não
 * informado" e nunca é devolvido como {@code false} (ZAP-128).
 */
public record RespostaProduto(Long id, String nome, String sabor, String unidade, BigDecimal preco,
		String descricao, String foto, String textoAlternativo, Boolean contemGluten, String outrosAlergenos,
		boolean ativo) {

	static RespostaProduto de(Produto produto, ArmazenamentoDeFotos armazenamento) {
		return new RespostaProduto(produto.getId(), produto.getNome(), produto.getSabor(),
				produto.getUnidadeMedida().getSigla(), produto.getPreco(), produto.getDescricao(),
				armazenamento.enderecoPublico(produto.getFotoCaminho()), produto.getFotoTextoAlternativo(),
				produto.getContemGluten(), produto.getOutrosAlergenos(), produto.isAtivo());
	}

}
