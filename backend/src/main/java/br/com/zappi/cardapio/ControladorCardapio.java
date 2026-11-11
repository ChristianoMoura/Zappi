package br.com.zappi.cardapio;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.zappi.pedido.RequisicaoPedido;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

/**
 * Portal do Cliente: rotas abertas, sem login (RN02). Leitura dos dados públicos da loja e
 * envio do pedido, sem expor nenhum dado de cliente (ISO 27002 5.15, 5.34).
 */
@RestController
@RequestMapping(ControladorCardapio.ROTA)
public class ControladorCardapio {

	/** Prefixo das rotas públicas do Portal do Cliente, liberado na configuração de segurança. */
	public static final String ROTA = "/api/cardapio";

	private final ServicoCardapio servico;

	private final ServicoPedidoPeloPortal envio;

	public ControladorCardapio(ServicoCardapio servico, ServicoPedidoPeloPortal envio) {
		this.servico = servico;
		this.envio = envio;
	}

	/**
	 * Cardápio pelo link da loja, ex.: {@code /api/cardapio/casa-belt} (ZAP-104): dados públicos
	 * da loja e os produtos ativos.
	 */
	@GetMapping("/{slug}")
	public RespostaCardapio buscar(@PathVariable String slug) {
		return servico.buscar(slug);
	}

	/**
	 * Pedido enviado pelo cliente (ZAP-109, RF21, RF22): entra como Novo no quadro da Lídia e
	 * responde 201 só com o número, para a tela de "pedido recebido". Acima do limite de envios,
	 * 429 (ZAP-112). Com o campo invisível preenchido, a resposta é a mesma de um envio aceito,
	 * mas sem número e sem gravar nada, para não avisar o robô.
	 */
	@PostMapping("/{slug}/pedidos")
	@ResponseStatus(HttpStatus.CREATED)
	public PedidoRecebido enviarPedido(@PathVariable String slug, @Valid @RequestBody RequisicaoPedido requisicao,
			HttpServletRequest http) {
		return new PedidoRecebido(envio.enviar(slug, requisicao, http.getRemoteAddr()).orElse(null));
	}

	/** Resposta do envio pelo portal: só o número do pedido (ISO 27002 5.34). */
	public record PedidoRecebido(Integer numero) {
	}

}
