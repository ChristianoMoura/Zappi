package br.com.zappi.estabelecimento;

/** O estabelecimento do token não existe mais no banco. */
public class EstabelecimentoNaoEncontradoException extends RuntimeException {

	private static final long serialVersionUID = 1L;

	public EstabelecimentoNaoEncontradoException() {
		super("Estabelecimento não encontrado.");
	}

}
