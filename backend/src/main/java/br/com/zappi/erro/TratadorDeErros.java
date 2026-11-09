package br.com.zappi.erro;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import br.com.zappi.armazenamento.ArmazenamentoIndisponivelException;
import br.com.zappi.autenticacao.CredenciaisInvalidasException;
import br.com.zappi.autenticacao.LoginBloqueadoException;
import br.com.zappi.produto.FotoInvalidaException;
import br.com.zappi.produto.FotoSemTextoAlternativoException;
import br.com.zappi.produto.ProdutoNaoEncontradoException;

/** Transforma as exceções da API em {@link RespostaErro}. */
@RestControllerAdvice
public class TratadorDeErros {

	private static final Logger log = LoggerFactory.getLogger(TratadorDeErros.class);

	private static final String DADOS_INVALIDOS = "DADOS_INVALIDOS";

	private static final String CONFIRA_OS_DADOS = "Confira os dados informados.";

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

	/** Campos inválidos: a mensagem de cada um vai em {@code campos}, para o formulário. */
	@ExceptionHandler(MethodArgumentNotValidException.class)
	@ResponseStatus(HttpStatus.BAD_REQUEST)
	RespostaErro camposInvalidos(MethodArgumentNotValidException erro) {
		Map<String, String> campos = new LinkedHashMap<>();
		for (FieldError campo : erro.getBindingResult().getFieldErrors()) {
			campos.putIfAbsent(campo.getField(), campo.getDefaultMessage());
		}
		return new RespostaErro(DADOS_INVALIDOS, CONFIRA_OS_DADOS, campos.isEmpty() ? null : campos);
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	@ResponseStatus(HttpStatus.BAD_REQUEST)
	RespostaErro corpoInvalido() {
		return new RespostaErro(DADOS_INVALIDOS, CONFIRA_OS_DADOS);
	}

	@ExceptionHandler(FotoSemTextoAlternativoException.class)
	@ResponseStatus(HttpStatus.BAD_REQUEST)
	RespostaErro fotoSemTextoAlternativo(FotoSemTextoAlternativoException erro) {
		return new RespostaErro(DADOS_INVALIDOS, CONFIRA_OS_DADOS, Map.of("textoAlternativo", erro.getMessage()));
	}

	@ExceptionHandler(ProdutoNaoEncontradoException.class)
	@ResponseStatus(HttpStatus.NOT_FOUND)
	RespostaErro produtoNaoEncontrado() {
		return new RespostaErro("PRODUTO_NAO_ENCONTRADO", "Produto não encontrado.");
	}

	@ExceptionHandler(FotoInvalidaException.class)
	@ResponseStatus(HttpStatus.BAD_REQUEST)
	RespostaErro fotoInvalida(FotoInvalidaException erro) {
		return new RespostaErro(DADOS_INVALIDOS, CONFIRA_OS_DADOS, Map.of(erro.getCampo(), erro.getMessage()));
	}

	/** Arquivo maior que o limite do servidor (5 MB), barrado antes de chegar ao controller. */
	@ExceptionHandler(MaxUploadSizeExceededException.class)
	@ResponseStatus(HttpStatus.BAD_REQUEST)
	RespostaErro fotoGrandeDemais() {
		return new RespostaErro(DADOS_INVALIDOS, CONFIRA_OS_DADOS, Map.of("arquivo", "A foto pode ter até 5 MB."));
	}

	/** O Storage não está configurado ou não respondeu: o resto da API continua funcionando. */
	@ExceptionHandler(ArmazenamentoIndisponivelException.class)
	ResponseEntity<RespostaErro> armazenamentoIndisponivel(ArmazenamentoIndisponivelException erro) {
		log.warn("Envio de foto indisponível: {}", erro.getMessage(), erro.getCause());
		return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
			.body(new RespostaErro("FOTO_INDISPONIVEL", "Não foi possível enviar a foto agora. Tente de novo em alguns minutos."));
	}

}
