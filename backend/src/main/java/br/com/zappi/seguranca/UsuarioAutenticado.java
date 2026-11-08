package br.com.zappi.seguranca;

/**
 * Quem fez a requisição, lido do token JWT. Os controllers recebem com
 * {@code @AuthenticationPrincipal UsuarioAutenticado usuario} e filtram os dados pelo
 * {@code estabelecimentoId}, nunca por um id vindo da requisição (RN01, ISO 27002 5.15).
 */
public record UsuarioAutenticado(Long usuarioId, Long estabelecimentoId) {
}
