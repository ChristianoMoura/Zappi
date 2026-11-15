package br.com.zappi.termos;

import java.time.OffsetDateTime;

/** Versão dos textos que a Lídia aceitou e quando, para a tela "Termos e privacidade". */
public record TermosAceitos(int versao, OffsetDateTime aceitoEm) {
}
