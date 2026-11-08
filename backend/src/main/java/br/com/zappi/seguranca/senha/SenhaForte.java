package br.com.zappi.seguranca.senha;

import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.ElementType.RECORD_COMPONENT;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

/**
 * Exige que o campo atenda à {@link PoliticaDeSenha}. Use em toda requisição que define
 * uma senha nova, ex.: {@code record RequisicaoNovaSenha(@SenhaForte String senha)}.
 */
@Documented
@Constraint(validatedBy = ValidadorSenhaForte.class)
@Target({ FIELD, PARAMETER, RECORD_COMPONENT })
@Retention(RUNTIME)
public @interface SenhaForte {

	String message() default PoliticaDeSenha.MENSAGEM;

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};

}
