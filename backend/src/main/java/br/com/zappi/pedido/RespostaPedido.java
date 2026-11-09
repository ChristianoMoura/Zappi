package br.com.zappi.pedido;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

import br.com.zappi.cliente.Cliente;
import br.com.zappi.mensagem.GeradorDeMensagens;
import br.com.zappi.mensagem.MensagemWhatsapp;

/**
 * Pedido como a tela usa (ZAP-44). O número ({@code #1}) identifica o pedido no
 * estabelecimento (RN09); o status vai como número, 1 a 5 (RN03). As datas de cada etapa
 * (RN06) vêm preenchidas só quando o pedido passou por ela.
 *
 * @param cancelado {@code true} quando o pedido recusado já tinha sido confirmado: a tela
 *        mostra "Motivo do cancelamento" (ZAP-64)
 * @param mensagens mensagens geradas para o cliente, só nos detalhes do pedido (ZAP-45); na
 *        listagem, o campo não aparece
 * @param avisoDeProntoEnviado só na volta de Concluído para Em produção (ZAP-75): {@code true}
 *        quando a mensagem de pronto já tinha sido enviada, para a tela avisar a Lídia de que o
 *        cliente precisa saber da volta (ZAP-64); nas outras respostas, o campo não aparece
 */
public record RespostaPedido(Integer numero, int status, LocalDate dataRetirada, String observacao,
		BigDecimal valorTotal, ClienteDoPedido cliente, List<ItemDoPedido> itens, OffsetDateTime criadoEm,
		OffsetDateTime confirmadoEm, OffsetDateTime producaoEm, OffsetDateTime concluidoEm,
		OffsetDateTime recusadoEm, String motivoRecusa, boolean cancelado,
		@JsonInclude(JsonInclude.Include.NON_NULL) List<MensagemDoPedido> mensagens,
		@JsonInclude(JsonInclude.Include.NON_NULL) Boolean avisoDeProntoEnviado) {

	/** A mesma resposta, informando se o aviso de pronto já tinha sido enviado. */
	RespostaPedido comAvisoDeProntoEnviado(boolean enviado) {
		return new RespostaPedido(numero, status, dataRetirada, observacao, valorTotal, cliente, itens, criadoEm,
				confirmadoEm, producaoEm, concluidoEm, recusadoEm, motivoRecusa, cancelado, mensagens, enviado);
	}

	/** Para a listagem do quadro, sem as mensagens. */
	static RespostaPedido de(Pedido pedido, List<ItemPedido> itens) {
		return de(pedido, itens, null);
	}

	/** Para os detalhes, com as mensagens geradas. */
	static RespostaPedido de(Pedido pedido, List<ItemPedido> itens, List<MensagemWhatsapp> mensagens) {
		boolean cancelado = pedido.getStatus() == StatusPedido.RECUSADO && pedido.getConfirmadoEm() != null;
		boolean anonimizado = pedido.getCliente().getAnonimizadoEm() != null;
		return new RespostaPedido(pedido.getNumero(), pedido.getStatus().getCodigo(), pedido.getDataRetirada(),
				pedido.getObservacao(), pedido.getValorTotal(), ClienteDoPedido.de(pedido.getCliente()),
				itens.stream().map(ItemDoPedido::de).toList(), pedido.getCriadoEm(), pedido.getConfirmadoEm(),
				pedido.getProducaoEm(), pedido.getConcluidoEm(), pedido.getRecusadoEm(), pedido.getMotivoRecusa(),
				cancelado,
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
	 * "Cliente anonimizado" e o telefone, nulo.
	 */
	public record ClienteDoPedido(String nome, String telefone, boolean anonimizado) {

		static final String NOME_ANONIMIZADO = "Cliente anonimizado";

		static ClienteDoPedido de(Cliente cliente) {
			if (cliente.getAnonimizadoEm() != null) {
				return new ClienteDoPedido(NOME_ANONIMIZADO, null, true);
			}
			return new ClienteDoPedido(cliente.getNome(), cliente.getTelefoneWhatsapp(), false);
		}

	}

	/** Item com o preço congelado no pedido (RN10) e o subtotal (RN11). */
	public record ItemDoPedido(String produto, String sabor, String unidade, BigDecimal quantidade,
			BigDecimal precoUnitario, BigDecimal subtotal, String recheio, String cobertura, String observacao) {

		static ItemDoPedido de(ItemPedido item) {
			return new ItemDoPedido(item.getProduto().getNome(), item.getProduto().getSabor(),
					item.getProduto().getUnidadeMedida().getSigla(), item.getQuantidade(),
					item.getPrecoUnitario(), item.getSubtotal(), item.getRecheio(), item.getCobertura(),
					item.getObservacao());
		}

	}

}
