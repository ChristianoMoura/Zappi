package br.com.zappi.categoria;

/** A categoria ainda tem produto não excluído e não pode ser excluída (ZAP-136). */
public class CategoriaComProdutoException extends RuntimeException {

	private static final long serialVersionUID = 1L;

	public CategoriaComProdutoException() {
		super("Mova os produtos desta categoria antes de excluí-la.");
	}

}
