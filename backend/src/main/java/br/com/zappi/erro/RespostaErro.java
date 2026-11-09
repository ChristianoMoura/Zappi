package br.com.zappi.erro;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Corpo das respostas de erro da API: um código estável, para o front decidir o que
 * fazer, e uma mensagem em linguagem simples, que pode ser mostrada na tela. Em dados
 * inválidos, {@code campos} traz a mensagem de cada campo, para o formulário mostrá-la ao
 * lado dele; nos outros erros, o campo não aparece.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record RespostaErro(String codigo, String mensagem, Map<String, String> campos) {

	public RespostaErro(String codigo, String mensagem) {
		this(codigo, mensagem, null);
	}

}
