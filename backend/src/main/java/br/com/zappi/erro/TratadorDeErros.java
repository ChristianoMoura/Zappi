package br.com.zappi.erro;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import br.com.zappi.autenticacao.CredenciaisInvalidasException;
import br.com.zappi.autenticacao.LoginBloqueadoException;

/** Transforma as exceções da API em {@link RespostaErro}. */
@RestControllerAdvice
public class TratadorDeErros {

	@ExceptionHandler(CredenciaisInvalidasException.class)
	@ResponseStatus(HttpStatus.UNAUTHORIZED)
	RespostaErro credenciaisInvalidas(CredenciaisInvalidasException erro) {
		return new RespostaErro("CREDENCIAIS_INVALIDAS", erro.getMessage());
	}

	/** 429 com o header Retry-After em segundos, arredondado para cima. */
	@ExceptionHandler(LoginBloqueadoException.class)
	ResponseEntity<RespostaErro> loginBloqueado(LoginBloqueadoException erro) {
		long segundos = Math.max(1, (erro.getRestante().toMillis() + 999) / 1000);
		return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
			.header(HttpHeaders.RETRY_AFTER, Long.toString(segundos))
			.body(new RespostaErro("LOGIN_BLOQUEADO", erro.getMessage()));
	}

	@ExceptionHandler({ MethodArgumentNotValidException.class, HttpMessageNotReadableException.class })
	@ResponseStatus(HttpStatus.BAD_REQUEST)
	RespostaErro dadosInvalidos() {
		return new RespostaErro("DADOS_INVALIDOS", "Confira os dados informados.");
	}

}
