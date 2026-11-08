package br.com.zappi.mensagem;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class ConversorTipoMensagem implements AttributeConverter<TipoMensagem, Short> {

	@Override
	public Short convertToDatabaseColumn(TipoMensagem tipo) {
		return tipo == null ? null : tipo.getCodigo();
	}

	@Override
	public TipoMensagem convertToEntityAttribute(Short codigo) {
		return codigo == null ? null : TipoMensagem.deCodigo(codigo);
	}

}
