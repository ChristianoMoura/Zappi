package br.com.zappi.categoria;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Corpo da criação e da edição da categoria (ZAP-136): só o nome, sem os espaços das pontas. */
public record RequisicaoCategoria(
		@NotBlank(message = "Escreva o nome da categoria.") @Size(max = 60, message = "Use até 60 caracteres.") String nome) {

	public RequisicaoCategoria {
		nome = nome == null ? null : nome.strip();
	}

}
