package br.com.zappi.termos;

import java.time.LocalDate;

/**
 * Resposta do {@code GET /api/publico/termos}: a versão vigente dos textos e a data em que ela
 * passou a valer. As telas comparam a versão com a que o aparelho lembra ter sido aceita.
 */
public record TermosVigentes(int versao, LocalDate data) {
}
