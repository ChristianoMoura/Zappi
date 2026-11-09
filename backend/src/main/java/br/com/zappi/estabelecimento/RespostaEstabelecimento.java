package br.com.zappi.estabelecimento;

import br.com.zappi.armazenamento.ArmazenamentoDoEstabelecimento;

/**
 * Estabelecimento como a tela "Meu estabelecimento" usa, com os nomes de campo dela (ZAP-37).
 * {@code logo} e {@code capa} são os endereços públicos das fotos no Storage (ZAP-119), ou
 * nulos sem foto.
 */
public record RespostaEstabelecimento(String nome, String slug, String descricao, String whatsapp,
		String emailContato, String cep, String logradouro, String numero, String complemento, String bairro,
		String cidade, String uf, String logo, String capa) {

	static RespostaEstabelecimento de(Estabelecimento estabelecimento, ArmazenamentoDoEstabelecimento armazenamento) {
		return new RespostaEstabelecimento(estabelecimento.getNome(), estabelecimento.getSlug(),
				estabelecimento.getDescricao(), estabelecimento.getTelefoneWhatsapp(),
				estabelecimento.getEmailContato(), estabelecimento.getCep(), estabelecimento.getLogradouro(),
				estabelecimento.getNumero(), estabelecimento.getComplemento(), estabelecimento.getBairro(),
				estabelecimento.getCidade(), estabelecimento.getUf(),
				armazenamento.enderecoPublico(estabelecimento.getLogoCaminho()),
				armazenamento.enderecoPublico(estabelecimento.getCapaCaminho()));
	}

}
