package br.com.zappi.produto;

import java.math.BigDecimal;

/**
 * Produto como a tela usa. {@code foto} é o endereço público da imagem, que chega com o
 * envio para o Storage (ZAP-40); até lá vem nulo.
 */
public record RespostaProduto(Long id, String nome, String sabor, String unidade, BigDecimal preco,
		String descricao, String foto, String textoAlternativo, boolean ativo) {

	static RespostaProduto de(Produto produto) {
		return new RespostaProduto(produto.getId(), produto.getNome(), produto.getSabor(),
				produto.getUnidadeMedida().getSigla(), produto.getPreco(), produto.getDescricao(), null,
				produto.getFotoTextoAlternativo(), produto.isAtivo());
	}

}
