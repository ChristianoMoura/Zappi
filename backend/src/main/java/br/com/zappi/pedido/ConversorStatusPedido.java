package br.com.zappi.pedido;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class ConversorStatusPedido implements AttributeConverter<StatusPedido, Short> {

	@Override
	public Short convertToDatabaseColumn(StatusPedido status) {
		return status == null ? null : status.getCodigo();
	}

	@Override
	public StatusPedido convertToEntityAttribute(Short codigo) {
		return codigo == null ? null : StatusPedido.deCodigo(codigo);
	}

}
