package br.com.zappi.estabelecimento;

/**
 * O estabelecimento do token não existe mais no banco, ou o link do cardápio público não leva a
 * nenhuma loja (ZAP-104).
 */
public class EstabelecimentoNaoEncontradoException extends RuntimeException {

	private static final long serialVersionUID = 1L;

	public EstabelecimentoNaoEncontradoException() {
		super("Estabelecimento não encontrado.");
	}

}
