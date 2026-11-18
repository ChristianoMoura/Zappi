package br.com.zappi.estabelecimento;

import java.util.List;

import br.com.zappi.armazenamento.ArmazenamentoDoEstabelecimento;

/**
 * Estabelecimento como a tela "Estabelecimento" usa, com os nomes de campo dela (ZAP-37).
 * {@code logo} e {@code capa} são os endereços públicos das fotos no Storage (ZAP-119), ou
 * nulos sem foto. {@code destacarPromocoes} é a opção de mostrar a seção "Promoções" no topo do
 * cardápio (ZAP-152). {@code formasPagamento} são os códigos das formas aceitas, na ordem da
 * lista (ZAP-190).
 */
public record RespostaEstabelecimento(String nome, String slug, String descricao, String whatsapp,
		String emailContato, String cep, String logradouro, String numero, String complemento, String bairro,
		String cidade, String uf, String logo, String capa, boolean destacarPromocoes, List<String> formasPagamento) {

	static RespostaEstabelecimento de(Estabelecimento estabelecimento, ArmazenamentoDoEstabelecimento armazenamento) {
		return new RespostaEstabelecimento(estabelecimento.getNome(), estabelecimento.getSlug(),
				estabelecimento.getDescricao(), estabelecimento.getTelefoneWhatsapp(),
				estabelecimento.getEmailContato(), estabelecimento.getCep(), estabelecimento.getLogradouro(),
				estabelecimento.getNumero(), estabelecimento.getComplemento(), estabelecimento.getBairro(),
				estabelecimento.getCidade(), estabelecimento.getUf(),
				armazenamento.enderecoPublico(estabelecimento.getLogoCaminho()),
				armazenamento.enderecoPublico(estabelecimento.getCapaCaminho()),
				estabelecimento.isDestacarPromocoes(), estabelecimento.getFormasPagamento());
	}

}
