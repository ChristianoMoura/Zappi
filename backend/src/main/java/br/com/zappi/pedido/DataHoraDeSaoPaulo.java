package br.com.zappi.pedido;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;

import tools.jackson.core.JsonParser;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.ValueDeserializer;

/**
 * Lê a data e hora de retirada com ou sem fuso (ZAP-109): o painel manda
 * {@code "2026-11-14T15:00"}, já no horário de São Paulo, e o Portal do Cliente manda
 * {@code "2026-11-14T15:00:00-03:00"}. Com fuso, a hora é convertida para o horário de São
 * Paulo, onde a Lídia entrega os pedidos, então {@code "…T18:00:00Z"} também vira 15h.
 */
public class DataHoraDeSaoPaulo extends ValueDeserializer<LocalDateTime> {

	private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

	@Override
	public LocalDateTime deserialize(JsonParser parser, DeserializationContext contexto) {
		String texto = parser.getValueAsString();
		if (texto == null || texto.isBlank()) {
			return null;
		}
		String limpo = texto.strip();
		try {
			return OffsetDateTime.parse(limpo).atZoneSameInstant(FUSO).toLocalDateTime();
		}
		catch (DateTimeParseException semFuso) {
			try {
				return LocalDateTime.parse(limpo);
			}
			catch (DateTimeParseException erro) {
				return (LocalDateTime) contexto.handleWeirdStringValue(LocalDateTime.class, limpo,
						"Data e hora de retirada inválida");
			}
		}
	}

}
