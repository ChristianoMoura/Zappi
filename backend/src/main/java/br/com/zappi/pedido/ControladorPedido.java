package br.com.zappi.pedido;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.zappi.seguranca.UsuarioAutenticado;

/** Pedidos do estabelecimento da usuária logada. Todas as rotas exigem o token. */
@RestController
@RequestMapping("/api/pedidos")
public class ControladorPedido {

	private final ServicoPedido servico;

	public ControladorPedido(ServicoPedido servico) {
		this.servico = servico;
	}

	/** Lista para o quadro (ZAP-44). {@code ?recusados=true} inclui os recusados (RN04). */
	@GetMapping
	public List<RespostaPedido> listar(@AuthenticationPrincipal UsuarioAutenticado usuario,
			@RequestParam(defaultValue = "false") boolean recusados) {
		return servico.listar(usuario, recusados);
	}

}
