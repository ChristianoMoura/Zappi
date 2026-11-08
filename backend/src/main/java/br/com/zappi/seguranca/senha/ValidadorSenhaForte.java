package br.com.zappi.seguranca.senha;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/** Valida {@link SenhaForte} com a {@link PoliticaDeSenha}. */
public class ValidadorSenhaForte implements ConstraintValidator<SenhaForte, String> {

	@Override
	public boolean isValid(String senha, ConstraintValidatorContext contexto) {
		return PoliticaDeSenha.atende(senha);
	}

}
