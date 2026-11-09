package br.com.zappi.produto;

import java.math.BigDecimal;
import java.util.Locale;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Corpo do cadastro e da edição de produto (RF05, RN13). Os nomes dos campos são os da
 * tela ({@code frontend/src/produtos/servicoProdutos.js}). A foto em si chega na ZAP-40.
 */
public record RequisicaoProduto(
		@NotBlank(message = "Informe o nome.") @Size(max = 100, message = "Use até 100 caracteres.") String nome,
		@NotBlank(message = "Informe o sabor.") @Size(max = 100, message = "Use até 100 caracteres.") String sabor,
		@NotBlank(message = "Escolha a unidade: KG ou UN.")
		@Pattern(regexp = "KG|UN", message = "Escolha a unidade: KG ou UN.") String unidade,
		@NotNull(message = "Informe o preço.")
		@DecimalMin(value = "0", inclusive = false, message = "Informe um preço maior que zero.")
		@Digits(integer = 8, fraction = 2, message = "Use no máximo 2 casas decimais.") BigDecimal preco,
		@Size(max = 500, message = "Use até 500 caracteres.") String descricao,
		@Size(max = 150, message = "Use até 150 caracteres.") String textoAlternativo) {

	public RequisicaoProduto {
		nome = obrigatorio(nome);
		sabor = obrigatorio(sabor);
		unidade = unidade == null ? null : unidade.trim().toUpperCase(Locale.ROOT);
		descricao = opcional(descricao);
		textoAlternativo = opcional(textoAlternativo);
	}

	/** Tira os espaços das pontas; vazio continua vazio, para o {@code @NotBlank} recusar. */
	private static String obrigatorio(String texto) {
		return texto == null ? null : texto.trim();
	}

	/** Campos opcionais vazios viram nulo no banco. */
	private static String opcional(String texto) {
		return texto == null || texto.isBlank() ? null : texto.trim();
	}

}
