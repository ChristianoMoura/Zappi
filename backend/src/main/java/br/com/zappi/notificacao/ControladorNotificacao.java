package br.com.zappi.notificacao;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.zappi.seguranca.UsuarioAutenticado;
import jakarta.validation.Valid;

/**
 * Notificações do sino do painel (ZAP-172, ZAP-174), só do estabelecimento da usuária logada.
 * Todas as rotas exigem o token (ISO 27002 5.15).
 */
@RestController
@RequestMapping("/api/notificacoes")
public class ControladorNotificacao {

	private final ServicoNotificacao servico;

	public ControladorNotificacao(ServicoNotificacao servico) {
		this.servico = servico;
	}

	/** Notificações dos últimos 30 dias, mais recentes primeiro, com o texto pronto. */
	@GetMapping
	public List<RespostaNotificacao> listar(@AuthenticationPrincipal UsuarioAutenticado usuario) {
		return servico.listar(usuario);
	}

	/**
	 * Quantas notificações não vistas há, ex.: {@code { "quantidade": 3 }}. Chamado a cada 1
	 * minuto; antes de contar, gera os avisos de retirada próxima que já chegaram.
	 */
	@GetMapping("/nao-vistas")
	public RespostaNaoVistas contarNaoVistas(@AuthenticationPrincipal UsuarioAutenticado usuario) {
		return new RespostaNaoVistas(servico.contarNaoVistas(usuario));
	}

	/** Marca como vistas as notificações que a caixinha exibiu. Responde 204. */
	@PostMapping("/vistas")
	public ResponseEntity<Void> marcarVistas(@AuthenticationPrincipal UsuarioAutenticado usuario,
			@Valid @RequestBody RequisicaoVistas requisicao) {
		servico.marcarVistas(usuario, requisicao.ids());
		return ResponseEntity.noContent().build();
	}

}
