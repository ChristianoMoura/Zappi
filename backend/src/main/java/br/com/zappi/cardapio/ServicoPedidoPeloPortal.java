package br.com.zappi.cardapio;

import java.util.Optional;

import org.springframework.stereotype.Service;

import br.com.zappi.estabelecimento.Estabelecimento;
import br.com.zappi.estabelecimento.EstabelecimentoNaoEncontradoException;
import br.com.zappi.estabelecimento.EstabelecimentoRepositorio;
import br.com.zappi.pedido.RequisicaoPedido;
import br.com.zappi.pedido.ServicoCadastroPedido;

/**
 * Envio do pedido pelo Portal do Cliente, com a proteção do acesso sem login (ZAP-112): descarta
 * o que um robô preencheu, confere o limite de envios e só então grava o pedido (ZAP-109). A
 * conferência fica fora da transação do cadastro, para o log da recusa não esperar a loja
 * bloqueada.
 */
@Service
public class ServicoPedidoPeloPortal {

	private final EstabelecimentoRepositorio estabelecimentos;

	private final LimiteDeEnviosDoPortal limite;

	private final ServicoCadastroPedido cadastro;

	public ServicoPedidoPeloPortal(EstabelecimentoRepositorio estabelecimentos, LimiteDeEnviosDoPortal limite,
			ServicoCadastroPedido cadastro) {
		this.estabelecimentos = estabelecimentos;
		this.limite = limite;
		this.cadastro = cadastro;
	}

	/**
	 * Número do pedido gravado, ou vazio quando o campo invisível veio preenchido: o envio é de um
	 * robô e é descartado sem gravar nada, nem no log (ZAP-103).
	 *
	 * @param ip IP do cliente, já lido do proxy do Render ({@code X-Forwarded-For})
	 */
	public Optional<Integer> enviar(String slug, RequisicaoPedido requisicao, String ip) {
		if (requisicao.site() != null) {
			return Optional.empty();
		}
		Estabelecimento loja = estabelecimentos.findBySlugAndAtivoTrue(slug)
			.orElseThrow(EstabelecimentoNaoEncontradoException::new);
		limite.conferir(loja.getId(), requisicao.cliente().telefone(), ip);
		return Optional.of(cadastro.cadastrarPeloPortal(slug, requisicao));
	}

}
