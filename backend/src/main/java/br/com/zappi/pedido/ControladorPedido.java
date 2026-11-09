package br.com.zappi.pedido;

import java.net.URI;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.zappi.seguranca.UsuarioAutenticado;
import jakarta.validation.Valid;

/** Pedidos do estabelecimento da usuária logada. Todas as rotas exigem o token. */
@RestController
@RequestMapping("/api/pedidos")
public class ControladorPedido {

	private final ServicoPedido servico;

	private final ServicoAcoesPedido acoes;

	private final ServicoCadastroPedido cadastro;

	public ControladorPedido(ServicoPedido servico, ServicoAcoesPedido acoes, ServicoCadastroPedido cadastro) {
		this.servico = servico;
		this.acoes = acoes;
		this.cadastro = cadastro;
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
	 * Cadastra o pedido como Novo (ZAP-88). Responde 201 com o pedido completo e o endereço
	 * dele em {@code Location}.
	 */
	@PostMapping
	public ResponseEntity<RespostaPedido> cadastrar(@AuthenticationPrincipal UsuarioAutenticado usuario,
			@Valid @RequestBody RequisicaoPedido requisicao) {
		RespostaPedido pedido = cadastro.cadastrar(usuario, requisicao);
		return ResponseEntity.created(URI.create("/api/pedidos/" + pedido.numero())).body(pedido);
	}

	/** Edita um pedido Novo, Confirmado ou Em produção (ZAP-90), com o mesmo corpo do cadastro. */
	@PutMapping("/{numero}")
	public RespostaPedido editar(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Integer numero,
			@Valid @RequestBody RequisicaoPedido requisicao) {
		return cadastro.editar(usuario, numero, requisicao);
	}

	/**
	 * Confirma um pedido Novo (ZAP-49) e devolve o pedido com a mensagem de confirmação
	 * pronta para enviar.
	 */
	@PostMapping("/{numero}/confirmar")
	public RespostaPedido confirmar(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Integer numero) {
		return acoes.confirmar(usuario, numero);
	}

	/**
	 * Recusa um pedido Novo ou cancela um Confirmado ou Em produção (ZAP-53), com o motivo
	 * obrigatório, e devolve o pedido com a mensagem de recusa pronta para enviar.
	 */
	@PostMapping("/{numero}/recusar")
	public RespostaPedido recusar(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Integer numero,
			@Valid @RequestBody RequisicaoRecusa requisicao) {
		return acoes.recusar(usuario, numero, requisicao.motivo());
	}

	/** Confirmado → Em produção (ZAP-75). */
	@PostMapping("/{numero}/iniciar-producao")
	public RespostaPedido iniciarProducao(@AuthenticationPrincipal UsuarioAutenticado usuario,
			@PathVariable Integer numero) {
		return acoes.iniciarProducao(usuario, numero);
	}

	/**
	 * Em produção → Concluído (ZAP-76) e devolve o pedido com a mensagem de pronto para
	 * retirada pronta para enviar.
	 */
	@PostMapping("/{numero}/concluir")
	public RespostaPedido concluir(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Integer numero) {
		return acoes.concluir(usuario, numero);
	}

	/** Volta de Em produção para Confirmado (ZAP-75). */
	@PostMapping("/{numero}/voltar-para-confirmado")
	public RespostaPedido voltarParaConfirmado(@AuthenticationPrincipal UsuarioAutenticado usuario,
			@PathVariable Integer numero) {
		return acoes.voltarParaConfirmado(usuario, numero);
	}

	/**
	 * Volta de Concluído para Em produção (ZAP-75). A resposta traz {@code avisoDeProntoEnviado}
	 * para a tela avisar a Lídia.
	 */
	@PostMapping("/{numero}/voltar-para-producao")
	public RespostaPedido voltarParaProducao(@AuthenticationPrincipal UsuarioAutenticado usuario,
			@PathVariable Integer numero) {
		return acoes.voltarParaProducao(usuario, numero);
	}

	/**
	 * Marca a mensagem como enviada quando a Lídia clica em "Enviar no WhatsApp" (ZAP-50).
	 * Chamar de novo ao reenviar não dá erro e mantém a data do primeiro envio.
	 */
	@PostMapping("/{numero}/mensagens/{id}/enviada")
	public RespostaPedido marcarMensagemEnviada(@AuthenticationPrincipal UsuarioAutenticado usuario,
			@PathVariable Integer numero, @PathVariable Long id) {
		return acoes.marcarMensagemEnviada(usuario, numero, id);
	}

}
