package br.com.zappi.mensagem;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class ConversorStatusMensagem implements AttributeConverter<StatusMensagem, Short> {

	@Override
	public Short convertToDatabaseColumn(StatusMensagem status) {
		return status == null ? null : status.getCodigo();
	}

	@Override
	public StatusMensagem convertToEntityAttribute(Short codigo) {
		return codigo == null ? null : StatusMensagem.deCodigo(codigo);
	}

}
