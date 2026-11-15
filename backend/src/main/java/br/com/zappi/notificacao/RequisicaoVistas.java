package br.com.zappi.notificacao;

import java.util.List;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Ids das notificações que a caixinha exibiu, ex.: {@code { "ids": [12, 13] }}. O limite cobre
 * com folga 30 dias de avisos da Casa Belt.
 */
public record RequisicaoVistas(@NotNull @Size(max = 500) List<@NotNull Long> ids) {
}
