package br.com.zappi.pedido;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.zappi.seguranca.UsuarioAutenticado;

/** Pedidos do estabelecimento da usuária logada. Todas as rotas exigem o token. */
@RestController
@RequestMapping("/api/pedidos")
public class ControladorPedido {

	private final ServicoPedido servico;

	private final ServicoAcoesPedido acoes;

	public ControladorPedido(ServicoPedido servico, ServicoAcoesPedido acoes) {
		this.servico = servico;
		this.acoes = acoes;
	}

	/** Lista para o quadro (ZAP-44). {@code ?recusados=true} inclui os recusados (RN04). */
	@GetMapping
	public List<RespostaPedido> listar(@AuthenticationPrincipal UsuarioAutenticado usuario,
			@RequestParam(defaultValue = "false") boolean recusados) {
		return servico.listar(usuario, recusados);
	}

	/** Pedido completo pelo número do card, ex.: {@code /api/pedidos/12} (ZAP-45). */
	@GetMapping("/{numero}")
	public RespostaPedido detalhar(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Integer numero) {
		return servico.detalhar(usuario, numero);
	}

	/**
	 * Confirma um pedido Novo (ZAP-49) e devolve o pedido com a mensagem de confirmação
	 * pronta para enviar.
	 */
	@PostMapping("/{numero}/confirmar")
	public RespostaPedido confirmar(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Integer numero) {
		return acoes.confirmar(usuario, numero);
	}

}
