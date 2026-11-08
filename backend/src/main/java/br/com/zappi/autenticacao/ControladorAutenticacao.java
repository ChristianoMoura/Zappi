package br.com.zappi.autenticacao;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.zappi.seguranca.ConfiguracaoSeguranca;
import jakarta.validation.Valid;

/** Login do painel (ZAP-31). A rota é aberta em {@link ConfiguracaoSeguranca}. */
@RestController
@RequestMapping("/api/autenticacao")
public class ControladorAutenticacao {

	private final ServicoAutenticacao servico;

	public ControladorAutenticacao(ServicoAutenticacao servico) {
		this.servico = servico;
	}

	@PostMapping("/login")
	public RespostaLogin entrar(@Valid @RequestBody RequisicaoLogin requisicao) {
		return servico.entrar(requisicao.email(), requisicao.senha());
	}

}
