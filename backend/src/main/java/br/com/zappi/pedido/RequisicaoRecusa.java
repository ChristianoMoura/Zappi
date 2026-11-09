package br.com.zappi.pedido;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Corpo da recusa e do cancelamento: o motivo é obrigatório, com até 500 caracteres (RN05). */
public record RequisicaoRecusa(
		@NotBlank(message = "Escreva o motivo.") @Size(max = 500, message = "Use até 500 caracteres.") String motivo) {

	public RequisicaoRecusa {
		// Só tira os espaços das pontas: o resto vai como a Lídia digitou
		motivo = motivo == null ? null : motivo.strip();
	}

}
