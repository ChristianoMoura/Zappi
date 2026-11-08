package br.com.zappi.erro;

/**
 * Corpo das respostas de erro da API: um código estável, para o front decidir o que
 * fazer, e uma mensagem em linguagem simples, que pode ser mostrada na tela.
 */
public record RespostaErro(String codigo, String mensagem) {
}
