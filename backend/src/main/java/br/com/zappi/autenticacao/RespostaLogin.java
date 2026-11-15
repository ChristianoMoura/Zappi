package br.com.zappi.autenticacao;

import br.com.zappi.termos.TermosAceitos;

/**
 * Resposta do login: o token JWT, enviado nas próximas requisições no header
 * {@code Authorization: Bearer}, o nome para o painel mostrar e a versão dos termos aceita, com a
 * data, para a tela "Termos e privacidade" (ZAP-146).
 */
public record RespostaLogin(String token, String nome, TermosAceitos termosAceitos) {
}
