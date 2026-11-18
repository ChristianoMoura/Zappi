package br.com.zappi.mensagem;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import br.com.zappi.TestcontainersConfiguration;
import br.com.zappi.pagamento.FormaPagamento;
import br.com.zappi.pedido.ItemPedidoRepositorio;
import br.com.zappi.pedido.Pedido;
import br.com.zappi.pedido.PedidoRepositorio;

/**
 * Textos de recusa e de pronto (ZAP-50), com o pedido #2 da V2 (Bruno, R$ 292,50), como
 * aprovados na ZAP-63 ({@code docs/mensagens-whatsapp.md}).
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class GeradorDeMensagensTests {

	@Autowired
	private GeradorDeMensagens gerador;

	@Autowired
	private PedidoRepositorio pedidos;

	@Autowired
	private ItemPedidoRepositorio itens;

	@Autowired
	private JdbcTemplate jdbc;

	private long casaBelt;

	@BeforeEach
	void prepara() {
		casaBelt = jdbc.queryForObject("select id from estabelecimento where slug = 'casa-belt'", Long.class);
	}

	@Test
	void recusaComOMotivoComoALidiaDigitou() {
		jdbc.update("update pedido set status = 5, recusado_em = now(), motivo_recusa = ? where estabelecimento_id = ? and numero = 2",
				"Tive um imprevisto de saúde e não vou conseguir produzir nesse dia.", casaBelt);

		assertThat(gerador.recusa(pedido(2))).isEqualTo("""
				Olá, Bruno.

				Infelizmente não vamos conseguir atender o seu pedido #2 para %s.

				Motivo: Tive um imprevisto de saúde e não vou conseguir produzir nesse dia.

				Se quiser combinar outra data ou outro pedido, é só responder esta mensagem.

				Casa Belt
				Mensagem gerada pelo Zappi""".formatted(data(2)));
	}

	@Test
	void prontoComOTotalAPagarNaRetirada() {
		assertThat(gerador.pronto(pedido(2))).isEqualTo("""
				Olá, Bruno!

				Seu pedido #2 está pronto para retirada.

				Retirada: %s
				Total a pagar na retirada: R$ 292,50

				Qualquer dúvida, é só responder esta mensagem.

				Casa Belt
				Mensagem gerada pelo Zappi""".formatted(data(2)));
	}

	@Test
	void prontoAvisaQueARetiradaEHoje() {
		jdbc.update("update pedido set data_retirada = ? where estabelecimento_id = ? and numero = 2",
				LocalDate.now(ZoneId.of("America/Sao_Paulo")).atTime(12, 0), casaBelt);

		assertThat(gerador.pronto(pedido(2))).contains("\nRetirada: hoje, " + data(2) + "\n");
	}

	@Test
	void escreveAHoraCheiaEAMeiaHora() {
		assertThat(GeradorDeMensagens.hora(LocalDateTime.of(2026, 11, 14, 15, 0))).isEqualTo("15h");
		assertThat(GeradorDeMensagens.hora(LocalDateTime.of(2026, 11, 14, 8, 30))).isEqualTo("8h30");
	}

	@Test
	void montaOLinkDoWhatsappComOTextoCodificado() {
		assertThat(GeradorDeMensagens.link("5511900000002", "Olá, Bruno!\n\nPedido #2 & mais"))
			.isEqualTo("https://wa.me/5511900000002?text=Ol%C3%A1%2C%20Bruno%21%0A%0APedido%20%232%20%26%20mais");
	}

	@Test
	void linhaDoPagamentoComCadaFormaESemForma() {
		assertThat(GeradorDeMensagens.pagamento(null)).isEqualTo("O pagamento é feito na retirada.");
		assertThat(GeradorDeMensagens.pagamento(FormaPagamento.DINHEIRO))
			.isEqualTo("O pagamento é feito na retirada, em dinheiro.");
		assertThat(GeradorDeMensagens.pagamento(FormaPagamento.PIX)).isEqualTo("O pagamento é feito na retirada, por Pix.");
		assertThat(GeradorDeMensagens.pagamento(FormaPagamento.CREDITO))
			.isEqualTo("O pagamento é feito na retirada, por cartão de crédito.");
		assertThat(GeradorDeMensagens.pagamento(FormaPagamento.DEBITO))
			.isEqualTo("O pagamento é feito na retirada, por cartão de débito.");
		assertThat(GeradorDeMensagens.pagamento(FormaPagamento.VR))
			.isEqualTo("O pagamento é feito na retirada, por vale-refeição.");
	}

	/**
	 * Linha do item só com o nome completo do produto e a quantidade (ZAP-136, ZAP-141). O pedido
	 * #1 da V2 tinha recheio e cobertura, que a V6 levou para a observação do item: eles não
	 * entram na mensagem.
	 */
	@Test
	void confirmacaoListaOsItensPeloNomeCompletoSemRecheioNemCobertura() {
		Pedido ana = pedido(1);
		assertThat(gerador.confirmacao(ana, itens.buscarDosPedidos(List.of(ana.getId()))))
			.contains("\n- Bolo de brigadeiro de chocolate (2 kg)\n")
			.doesNotContain("Recheio", "Cobertura", "Granulado");

		// A V2 grava os itens do #2 por um JOIN, sem ordem garantida: cada linha é conferida sozinha
		Pedido bruno = pedido(2);
		assertThat(gerador.confirmacao(bruno, itens.buscarDosPedidos(List.of(bruno.getId()))))
			.contains("\n- Cento de coxinha (1 un)\n", "\n- Bolo de ninho com morango (1,5 kg)\n");
	}

	private Pedido pedido(int numero) {
		return pedidos.findByEstabelecimentoIdAndNumero(casaBelt, numero).orElseThrow();
	}

	/** "sábado, 14/11, às 12h", a partir da data de retirada gravada. */
	private String data(int numero) {
		LocalDateTime data = jdbc.queryForObject("select data_retirada from pedido where estabelecimento_id = ? and numero = ?",
				LocalDateTime.class, casaBelt, numero);
		return "%s, %02d/%02d, às %dh".formatted(data.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.forLanguageTag("pt-BR")),
				data.getDayOfMonth(), data.getMonthValue(), data.getHour());
	}

}
