package br.com.zappi.seguranca.senha;

import java.nio.charset.StandardCharsets;

/**
 * Política de senha do painel (ISO 27002 5.17): pelo menos 8
 * caracteres, com letra, número e caractere especial. Vale para toda senha definida
 * pelo sistema; nos campos de entrada, use {@link SenhaForte}.
 */
public final class PoliticaDeSenha {

	public static final int TAMANHO_MINIMO = 8;

	/** O BCrypt só usa os primeiros 72 bytes; acima disso, o resto seria ignorado sem aviso. */
	public static final int TAMANHO_MAXIMO_EM_BYTES = 72;

	public static final String MENSAGEM = "A senha precisa ter pelo menos " + TAMANHO_MINIMO
			+ " caracteres, com letras, números e pelo menos 1 caractere especial.";

	private PoliticaDeSenha() {
	}

	public static boolean atende(String senha) {
		if (senha == null || senha.length() < TAMANHO_MINIMO
				|| senha.getBytes(StandardCharsets.UTF_8).length > TAMANHO_MAXIMO_EM_BYTES) {
			return false;
		}
		boolean temLetra = senha.codePoints().anyMatch(Character::isLetter);
		boolean temNumero = senha.codePoints().anyMatch(Character::isDigit);
		boolean temEspecial = senha.codePoints().anyMatch(PoliticaDeSenha::ehEspecial);
		return temLetra && temNumero && temEspecial;
	}

	/** Qualquer caractere que não seja letra, número ou espaço, como {@code @ # ! . -}. */
	private static boolean ehEspecial(int caractere) {
		return !Character.isLetterOrDigit(caractere) && !Character.isWhitespace(caractere);
	}

}
