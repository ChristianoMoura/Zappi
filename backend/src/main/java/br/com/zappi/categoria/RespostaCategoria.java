package br.com.zappi.categoria;

/**
 * Categoria como a tela usa (ZAP-139): na lista de categorias, no produto e no cardápio
 * público (ZAP-140).
 */
public record RespostaCategoria(Long id, String nome) {

	public static RespostaCategoria de(Categoria categoria) {
		return new RespostaCategoria(categoria.getId(), categoria.getNome());
	}

}
