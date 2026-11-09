package br.com.zappi.estabelecimento;

/** Estabelecimento como a tela "Meu estabelecimento" usa, com os nomes de campo dela (ZAP-37). */
public record RespostaEstabelecimento(String nome, String slug, String descricao, String whatsapp,
		String emailContato, String cep, String logradouro, String numero, String complemento, String bairro,
		String cidade, String uf) {

	static RespostaEstabelecimento de(Estabelecimento estabelecimento) {
		return new RespostaEstabelecimento(estabelecimento.getNome(), estabelecimento.getSlug(),
				estabelecimento.getDescricao(), estabelecimento.getTelefoneWhatsapp(),
				estabelecimento.getEmailContato(), estabelecimento.getCep(), estabelecimento.getLogradouro(),
				estabelecimento.getNumero(), estabelecimento.getComplemento(), estabelecimento.getBairro(),
				estabelecimento.getCidade(), estabelecimento.getUf());
	}

}
