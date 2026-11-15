package br.com.zappi.categoria;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

/**
 * A ordem nova das categorias, gravada de uma vez (ZAP-136): todos os ids das categorias da
 * loja, do primeiro ao último, cada um uma vez.
 */
public record RequisicaoOrdemCategorias(
		@NotEmpty(message = RequisicaoOrdemCategorias.LISTA_INVALIDA) List<@NotNull(message = RequisicaoOrdemCategorias.LISTA_INVALIDA) Long> ids) {

	static final String LISTA_INVALIDA = "A lista precisa ter todas as categorias da loja, cada uma uma vez.";

}
