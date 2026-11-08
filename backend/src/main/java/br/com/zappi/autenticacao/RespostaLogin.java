package br.com.zappi.autenticacao;

/**
 * Resposta do login: o token JWT, enviado nas próximas requisições no header
 * {@code Authorization: Bearer}, e o nome para o painel mostrar.
 */
public record RespostaLogin(String token, String nome) {
}
