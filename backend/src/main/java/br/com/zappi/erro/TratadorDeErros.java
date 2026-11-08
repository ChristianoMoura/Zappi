package br.com.zappi.erro;

import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import br.com.zappi.autenticacao.CredenciaisInvalidasException;

/** Transforma as exceções da API em {@link RespostaErro}. */
@RestControllerAdvice
public class TratadorDeErros {

	@ExceptionHandler(CredenciaisInvalidasException.class)
	@ResponseStatus(HttpStatus.UNAUTHORIZED)
	RespostaErro credenciaisInvalidas(CredenciaisInvalidasException erro) {
		return new RespostaErro("CREDENCIAIS_INVALIDAS", erro.getMessage());
	}

	@ExceptionHandler({ MethodArgumentNotValidException.class, HttpMessageNotReadableException.class })
	@ResponseStatus(HttpStatus.BAD_REQUEST)
	RespostaErro dadosInvalidos() {
		return new RespostaErro("DADOS_INVALIDOS", "Confira os dados informados.");
	}

}
