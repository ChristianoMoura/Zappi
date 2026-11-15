package br.com.zappi.produto;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

/**
 * Corpo de "Aplicar desconto" (ZAP-152, ZAP-160), com os nomes da tela
 * ({@code frontend/src/produtos/SecaoPromocao.jsx}). {@code preco} é o "Preço antes da
 * promoção", que passa a ser o preço normal do produto; {@code precoPromocional} é o "Preço com
 * desconto". Que o desconto é menor que o preço antes é conferido no serviço, com a mensagem no
 * campo {@code precoPromocional}.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record RequisicaoPromocao(
		@NotNull(message = "Escreva o preço antes da promoção. Ex.: 100,00.")
		@DecimalMin(value = "0", inclusive = false, message = "Informe um preço maior que zero.")
		@Digits(integer = 8, fraction = 2, message = "Use no máximo 2 casas decimais.") BigDecimal preco,
		@NotNull(message = "Escreva o preço com desconto. Ex.: 80,00.")
		@DecimalMin(value = "0", inclusive = false, message = "O preço com desconto precisa ser maior que zero.")
		@Digits(integer = 8, fraction = 2, message = "Use no máximo 2 casas decimais.") BigDecimal precoPromocional) {

}
