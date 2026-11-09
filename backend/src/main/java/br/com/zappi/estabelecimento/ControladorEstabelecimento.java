package br.com.zappi.estabelecimento;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.zappi.seguranca.UsuarioAutenticado;
import jakarta.validation.Valid;

/**
 * Estabelecimento da usuária logada (ZAP-36). Não há id na rota: o estabelecimento é o do
 * token (RN01). Todas as rotas exigem o token.
 */
@RestController
@RequestMapping("/api/estabelecimento")
public class ControladorEstabelecimento {

	private final ServicoEstabelecimento servico;

	public ControladorEstabelecimento(ServicoEstabelecimento servico) {
		this.servico = servico;
	}

	@GetMapping
	public RespostaEstabelecimento buscar(@AuthenticationPrincipal UsuarioAutenticado usuario) {
		return servico.buscar(usuario);
	}

	@PutMapping
	public RespostaEstabelecimento editar(@AuthenticationPrincipal UsuarioAutenticado usuario,
			@Valid @RequestBody RequisicaoEstabelecimento dados) {
		return servico.editar(usuario, dados);
	}

}
