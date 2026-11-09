package br.com.zappi.estabelecimento;

import java.util.Locale;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Corpo da edição do estabelecimento (RF03, RF04). Os nomes dos campos são os da tela
 * ({@code frontend/src/estabelecimento/servicoEstabelecimento.js}): {@code whatsapp} é a
 * coluna {@code telefone_whatsapp} e {@code emailContato} é {@code email_contato}. A edição
 * troca todos os campos: um campo opcional que não vier fica vazio.
 */
public record RequisicaoEstabelecimento(
		@NotBlank(message = "Digite o nome do estabelecimento.")
		@Size(max = 100, message = "Use no máximo 100 caracteres.") String nome,
		@NotBlank(message = "Digite o link do cardápio.")
		@Size(max = 60, message = "Use no máximo 60 caracteres.")
		@Pattern(regexp = "[a-z0-9]+(-[a-z0-9]+)*",
				message = "Use só letras minúsculas, números e hífen, sem espaços. Ex.: casa-belt") String slug,
		@Size(max = 500, message = "Use no máximo 500 caracteres.") String descricao,
		@NotBlank(message = "Digite o WhatsApp com DDD.")
		@Pattern(regexp = "\\d{13}",
				message = "O WhatsApp precisa ter 13 números: 55, o DDD e o número. Ex.: 5511900000000") String whatsapp,
		@Size(max = 150, message = "Use no máximo 150 caracteres.")
		@Pattern(regexp = "[^\\s@]+@[^\\s@]+\\.[^\\s@]+",
				message = "Confira o e-mail. Ele precisa ter \"@\" e um ponto.") String emailContato,
		@Pattern(regexp = "\\d{8}", message = "O CEP tem 8 números. Ex.: 01000-000") String cep,
		@Size(max = 150, message = "Use no máximo 150 caracteres.") String logradouro,
		@Size(max = 10, message = "Use no máximo 10 caracteres.") String numero,
		@Size(max = 60, message = "Use no máximo 60 caracteres.") String complemento,
		@Size(max = 80, message = "Use no máximo 80 caracteres.") String bairro,
		@Size(max = 80, message = "Use no máximo 80 caracteres.") String cidade,
		@Pattern(regexp = "AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO",
				message = "Escolha o estado na lista.") String uf) {

	/** Separadores que a Lídia pode digitar no telefone e no CEP, ex.: "(11) 90000-0000". */
	private static final String SEPARADORES = "[\\s().+-]";

	public RequisicaoEstabelecimento {
		nome = obrigatorio(nome);
		slug = obrigatorio(slug);
		whatsapp = obrigatorio(semSeparadores(whatsapp));
		descricao = opcional(descricao);
		emailContato = opcional(emailContato);
		cep = opcional(semSeparadores(cep));
		logradouro = opcional(logradouro);
		numero = opcional(numero);
		complemento = opcional(complemento);
		bairro = opcional(bairro);
		cidade = opcional(cidade);
		uf = opcional(uf) == null ? null : uf.trim().toUpperCase(Locale.ROOT);
	}

	/** Tira os espaços das pontas; vazio continua vazio, para o {@code @NotBlank} recusar. */
	private static String obrigatorio(String texto) {
		return texto == null ? null : texto.trim();
	}

	/** Campos opcionais vazios viram nulo no banco. */
	private static String opcional(String texto) {
		return texto == null || texto.isBlank() ? null : texto.trim();
	}

	/**
	 * Só tira os separadores comuns: letras continuam no texto, para a validação recusar o
	 * valor em vez de apagá-lo sem avisar.
	 */
	private static String semSeparadores(String texto) {
		return texto == null ? null : texto.replaceAll(SEPARADORES, "");
	}

}
