package br.com.zappi.pedido;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

import br.com.zappi.cliente.Cliente;
import br.com.zappi.mensagem.GeradorDeMensagens;
import br.com.zappi.mensagem.MensagemWhatsapp;

/**
 * Pedido como a tela usa (ZAP-44). O número ({@code #1}) identifica o pedido no
 * estabelecimento (RN09); o status vai como número, 1 a 6 (RN03). As datas de cada etapa
 * (RN06) vêm preenchidas só quando o pedido passou por ela; {@code entregueEm}, só no Entregue
 * (ZAP-60).
 *
 * @param cancelado {@code true} quando o pedido recusado já tinha sido confirmado: a tela
 *        mostra "Motivo do cancelamento" (ZAP-64)
 * @param formaPagamento código da forma de pagamento combinada (ZAP-190), ou nulo no pedido de
 *        antes dela: o campo sempre aparece, e a tela mostra "Não informada"
 * @param mensagens mensagens geradas para o cliente (ZAP-45), da mais antiga para a mais nova; a
 *        listagem também traz, para o painel aberto pelo quadro (ZAP-122)
 * @param avisoDeProntoEnviado só na volta de Concluído para Em produção (ZAP-75): {@code true}
 *        quando a mensagem de pronto já tinha sido enviada, para a tela avisar a Lídia de que o
 *        cliente precisa saber da volta (ZAP-64); nas outras respostas, o campo não aparece
 */
public record RespostaPedido(Integer numero, int status, LocalDateTime dataRetirada, String observacao,
		BigDecimal valorTotal, ClienteDoPedido cliente, List<ItemDoPedido> itens, OffsetDateTime criadoEm,
		OffsetDateTime confirmadoEm, OffsetDateTime producaoEm, OffsetDateTime concluidoEm,
		OffsetDateTime entregueEm, OffsetDateTime recusadoEm, String motivoRecusa, boolean cancelado,
		String formaPagamento,
		@JsonInclude(JsonInclude.Include.NON_NULL) List<MensagemDoPedido> mensagens,
		@JsonInclude(JsonInclude.Include.NON_NULL) Boolean avisoDeProntoEnviado) {

	/** A mesma resposta, informando se o aviso de pronto já tinha sido enviado. */
	RespostaPedido comAvisoDeProntoEnviado(boolean enviado) {
		return new RespostaPedido(numero, status, dataRetirada, observacao, valorTotal, cliente, itens, criadoEm,
				confirmadoEm, producaoEm, concluidoEm, entregueEm, recusadoEm, motivoRecusa, cancelado, formaPagamento,
				mensagens, enviado);
	}

	/** Pedido com os itens e as mensagens geradas, para a listagem e os detalhes. */
	static RespostaPedido de(Pedido pedido, List<ItemPedido> itens, List<MensagemWhatsapp> mensagens) {
		boolean cancelado = pedido.getStatus() == StatusPedido.RECUSADO && pedido.getConfirmadoEm() != null;
		boolean anonimizado = pedido.getCliente().getAnonimizadoEm() != null;
		return new RespostaPedido(pedido.getNumero(), pedido.getStatus().getCodigo(), pedido.getDataRetirada(),
				pedido.getObservacao(), pedido.getValorTotal(), ClienteDoPedido.de(pedido),
				itens.stream().map(ItemDoPedido::de).toList(), pedido.getCriadoEm(), pedido.getConfirmadoEm(),
				pedido.getProducaoEm(), pedido.getConcluidoEm(), pedido.getEntregueEm(), pedido.getRecusadoEm(),
				pedido.getMotivoRecusa(),
				cancelado,
				pedido.getFormaPagamento() == null ? null : pedido.getFormaPagamento().name(),
				mensagens == null ? null : mensagens.stream().map(m -> MensagemDoPedido.de(m, anonimizado)).toList(),
				null);
	}

	/**
	 * Mensagem gerada para o cliente (RN07), com o link {@code wa.me} que abre o WhatsApp com o
	 * texto pronto. Com o cliente anonimizado (RN17), o link não é montado: o telefone já não
	 * é o dele.
	 *
	 * @param id usado para marcar a mensagem como enviada (ZAP-50)
	 * @param tipo {@code CONFIRMACAO}, {@code RECUSA} ou {@code PRONTO}
	 * @param status {@code PENDENTE}, {@code ENVIADA} ou {@code FALHA}
	 */
	public record MensagemDoPedido(Long id, String tipo, String status, String texto, OffsetDateTime criadoEm,
			OffsetDateTime enviadoEm, String link) {

		static MensagemDoPedido de(MensagemWhatsapp mensagem, boolean clienteAnonimizado) {
			String link = clienteAnonimizado ? null
					: GeradorDeMensagens.link(mensagem.getTelefoneDestino(), mensagem.getConteudo());
			return new MensagemDoPedido(mensagem.getId(), mensagem.getTipo().name(), mensagem.getStatus().name(),
					mensagem.getConteudo(), mensagem.getCriadoEm(), mensagem.getEnviadoEm(), link);
		}

	}

	/**
	 * Cliente do pedido. Anonimizado (RN17, LGPD), não expõe dados pessoais: o nome vem como
	 * "Cliente anonimizado" e o telefone, nulo. O nome é o informado no pedido (ZAP-199), e o
	 * telefone, o do cliente.
	 */
	public record ClienteDoPedido(String nome, String telefone, boolean anonimizado) {

		static ClienteDoPedido de(Pedido pedido) {
			Cliente cliente = pedido.getCliente();
			if (cliente.getAnonimizadoEm() != null) {
				return new ClienteDoPedido(Cliente.NOME_ANONIMIZADO, null, true);
			}
			return new ClienteDoPedido(pedido.getNomeCliente(), cliente.getTelefoneWhatsapp(), false);
		}

	}

	/**
	 * Item com o preço congelado no pedido (RN10) e o subtotal (RN11).
	 *
	 * @param produtoId usado na edição (ZAP-90): o item com o mesmo produto mantém o preço
	 * @param produto nome completo do produto (ZAP-136)
	 */
	public record ItemDoPedido(Long produtoId, String produto, String unidade, BigDecimal quantidade,
			BigDecimal precoUnitario, BigDecimal subtotal, String observacao) {

		static ItemDoPedido de(ItemPedido item) {
			return new ItemDoPedido(item.getProduto().getId(), item.getProduto().getNome(),
					item.getProduto().getUnidadeMedida().getSigla(), item.getQuantidade(),
					item.getPrecoUnitario(), item.getSubtotal(), item.getObservacao());
		}

	}

}
