package br.com.zappi.notificacao;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class ConversorTipoNotificacao implements AttributeConverter<TipoNotificacao, Short> {

	@Override
	public Short convertToDatabaseColumn(TipoNotificacao tipo) {
		return tipo == null ? null : tipo.getCodigo();
	}

	@Override
	public TipoNotificacao convertToEntityAttribute(Short codigo) {
		return codigo == null ? null : TipoNotificacao.deCodigo(codigo);
	}

}
