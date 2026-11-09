package br.com.zappi.mensagem;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.Locale;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import br.com.zappi.TestcontainersConfiguration;
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
				LocalDate.now(ZoneId.of("America/Sao_Paulo")), casaBelt);

		assertThat(gerador.pronto(pedido(2))).contains("\nRetirada: hoje, " + data(2) + "\n");
	}

	@Test
	void montaOLinkDoWhatsappComOTextoCodificado() {
		assertThat(GeradorDeMensagens.link("5511900000002", "Olá, Bruno!\n\nPedido #2 & mais"))
			.isEqualTo("https://wa.me/5511900000002?text=Ol%C3%A1%2C%20Bruno%21%0A%0APedido%20%232%20%26%20mais");
	}

	private Pedido pedido(int numero) {
		return pedidos.findByEstabelecimentoIdAndNumero(casaBelt, numero).orElseThrow();
	}

	/** "sábado, 14/11", a partir da data de retirada gravada. */
	private String data(int numero) {
		LocalDate data = jdbc.queryForObject("select data_retirada from pedido where estabelecimento_id = ? and numero = ?",
				LocalDate.class, casaBelt, numero);
		return "%s, %02d/%02d".formatted(data.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.forLanguageTag("pt-BR")),
				data.getDayOfMonth(), data.getMonthValue());
	}

}
