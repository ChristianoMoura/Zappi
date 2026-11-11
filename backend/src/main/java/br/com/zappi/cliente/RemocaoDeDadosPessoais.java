package br.com.zappi.cliente;

import java.util.Arrays;
import java.util.regex.MatchResult;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Tira o nome e o telefone de um cliente de textos já gravados, ao anonimizar (RN17, LGPD).
 * O nome vira "Cliente anonimizado" e o telefone, o telefone anonimizado do cliente. Maiúsculas
 * e minúsculas não importam, e cada trecho é trocado uma vez só.
 */
public final class RemocaoDeDadosPessoais {

	/** Letra ou número antes ou depois do primeiro nome: aí é parte de outra palavra. */
	private static final String FORA_DE_PALAVRA_ANTES = "(?<![\\p{L}\\p{N}])";

	private static final String FORA_DE_PALAVRA_DEPOIS = "(?![\\p{L}\\p{N}])";

	private final String telefone;

	private final String telefoneAnonimizado;

	private final Pattern nomeCompletoOuTelefone;

	private final Pattern comPrimeiroNome;

	/**
	 * @param nome nome original do cliente
	 * @param telefone telefone original do cliente
	 * @param telefoneAnonimizado o que entra no lugar do telefone
	 */
	public RemocaoDeDadosPessoais(String nome, String telefone, String telefoneAnonimizado) {
		this.telefone = telefone;
		this.telefoneAnonimizado = telefoneAnonimizado;
		String[] palavras = nome.trim().split("\\s+");
		// Nome completo com qualquer espaço entre as palavras: "Ana  Exemplo" casa com "ana exemplo"
		String nomeCompleto = Arrays.stream(palavras).map(Pattern::quote).collect(Collectors.joining("\\s+"));
		String primeiroNome = FORA_DE_PALAVRA_ANTES + Pattern.quote(palavras[0]) + FORA_DE_PALAVRA_DEPOIS;
		int opcoes = Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE;
		this.nomeCompletoOuTelefone = Pattern.compile(nomeCompleto + "|" + Pattern.quote(telefone), opcoes);
		this.comPrimeiroNome = Pattern.compile(nomeCompleto + "|" + Pattern.quote(telefone) + "|" + primeiroNome,
				opcoes);
	}

	/**
	 * Texto das mensagens ao cliente, que o cumprimentam pelo primeiro nome ("Olá, Ana!"): tira o
	 * nome completo, o primeiro nome como palavra inteira e o telefone.
	 */
	public String daMensagem(String texto) {
		return trocar(comPrimeiroNome, texto);
	}

	/**
	 * Valores gravados no log: tira o nome completo e o telefone. O primeiro nome sozinho fica,
	 * porque o log guarda outros textos (ex.: nomes de produtos) e o sistema não grava o
	 * primeiro nome do cliente nele.
	 */
	public String doLog(String texto) {
		return trocar(nomeCompletoOuTelefone, texto);
	}

	private String trocar(Pattern padrao, String texto) {
		if (texto == null) {
			return null;
		}
		return padrao.matcher(texto).replaceAll(this::substituto);
	}

	private String substituto(MatchResult trecho) {
		String novo = trecho.group().equals(telefone) ? telefoneAnonimizado : Cliente.NOME_ANONIMIZADO;
		return Matcher.quoteReplacement(novo);
	}

}
