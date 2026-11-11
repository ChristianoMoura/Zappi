package br.com.zappi.pedido;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.Locale;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import br.com.zappi.TestcontainersConfiguration;
import br.com.zappi.seguranca.ServicoToken;
import br.com.zappi.seguranca.UsuarioAutenticado;

/**
 * Confirmar pedido (ZAP-49) com os pedidos Novos da V2: #1 (Ana, 2 kg de bolo de
 * brigadeiro, R$ 200,00) e #2 (Bruno, cento de coxinha e 1,5 kg de Ninho, R$ 292,50).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class ConfirmarPedidoTests {

	private static final ZoneId SAO_PAULO = ZoneId.of("America/Sao_Paulo");

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private ServicoToken servicoToken;

	private long casaBelt;

	private long lidia;

	private String token;

	@BeforeEach
	void prepara() {
		Map<String, Object> dados = jdbc.queryForMap(
				"select id, estabelecimento_id from usuario where email = 'lidia@casabelt.com'");
		lidia = ((Number) dados.get("id")).longValue();
		casaBelt = ((Number) dados.get("estabelecimento_id")).longValue();
		token = servicoToken.gerar(new UsuarioAutenticado(lidia, casaBelt));
	}

	@Test
	void confirmaOPedidoNovoComAMensagemPronta() throws Exception {
		String texto = """
				Olá, Ana!

				Seu pedido #1 na Casa Belt está confirmado.

				- Bolo de brigadeiro de chocolate (2 kg)
				Total: R$ 200,00
				Retirada: %s

				O pagamento é feito na retirada. Qualquer dúvida, é só responder esta mensagem.

				Mensagem gerada pelo Zappi""".formatted(dataEsperada(1));

		confirmar(1)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.numero").value(1))
			.andExpect(jsonPath("$.status").value(2))
			.andExpect(jsonPath("$.confirmadoEm").isString())
			.andExpect(jsonPath("$.mensagens.length()").value(1))
			.andExpect(jsonPath("$.mensagens[0].tipo").value("CONFIRMACAO"))
			.andExpect(jsonPath("$.mensagens[0].status").value("PENDENTE"))
			.andExpect(jsonPath("$.mensagens[0].texto").value(texto))
			.andExpect(jsonPath("$.mensagens[0].criadoEm").isString())
			.andExpect(jsonPath("$.mensagens[0].link", startsWith("https://wa.me/5511900000001?text=Ol%C3%A1%2C%20Ana%21")));

		Map<String, Object> pedido = jdbc.queryForMap(
				"select status, confirmado_em from pedido where estabelecimento_id = ? and numero = 1", casaBelt);
		assertThat(((Number) pedido.get("status")).intValue()).isEqualTo(2);
		assertThat(pedido.get("confirmado_em")).isNotNull();
		assertThat(jdbc.queryForMap("""
				select m.tipo, m.status, m.telefone_destino, m.conteudo from mensagem_whatsapp m
				join pedido p on p.id = m.pedido_id where p.estabelecimento_id = ? and p.numero = 1
				""", casaBelt))
			.containsEntry("telefone_destino", "5511900000001")
			.containsEntry("conteudo", texto);
	}

	@Test
	void escreveCadaItemComAUnidadeEOTotal() throws Exception {
		confirmar(2)
			.andExpect(jsonPath("$.mensagens[0].texto", startsWith("Olá, Bruno!\n\nSeu pedido #2 na Casa Belt está confirmado.")))
			.andExpect(jsonPath("$.mensagens[0].texto", containsString("- Cento de coxinha (1 un)\n")))
			.andExpect(jsonPath("$.mensagens[0].texto", containsString("- Bolo de ninho com morango (1,5 kg)\n")))
			.andExpect(jsonPath("$.mensagens[0].texto", containsString("\nTotal: R$ 292,50\n")));
	}

	@Test
	void avisaQueARetiradaEHojeNoFusoDaCasaBelt() throws Exception {
		jdbc.update("update pedido set data_retirada = ? where estabelecimento_id = ? and numero = 1",
				LocalDate.now(SAO_PAULO).atTime(12, 0), casaBelt);

		confirmar(1).andExpect(jsonPath("$.mensagens[0].texto", containsString("Retirada: hoje, " + dataEsperada(1) + "\n")));
	}

	@Test
	void registraOLogNaMesmaAcao() throws Exception {
		confirmar(1).andExpect(status().isOk());

		assertThat(jdbc.queryForMap("""
				select l.usuario_id, l.estabelecimento_id, l.entidade, l.detalhes ->> 'statusAntes' as antes,
				       l.detalhes ->> 'statusDepois' as depois
				from log_auditoria l join pedido p on p.id = l.entidade_id
				where l.acao = 'PEDIDO_CONFIRMADO' and p.estabelecimento_id = ? and p.numero = 1
				""", casaBelt))
			.containsEntry("usuario_id", lidia)
			.containsEntry("estabelecimento_id", casaBelt)
			.containsEntry("entidade", "pedido")
			.containsEntry("antes", "NOVO")
			.containsEntry("depois", "CONFIRMADO");
	}

	@Test
	void naoConfirmaDuasVezes() throws Exception {
		confirmar(1).andExpect(status().isOk());

		confirmar(1)
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.codigo").value("TRANSICAO_NAO_PERMITIDA"))
			.andExpect(jsonPath("$.mensagem").value("Só pedidos novos podem ser confirmados."));
		assertThat(jdbc.queryForObject("""
				select count(*) from mensagem_whatsapp m join pedido p on p.id = m.pedido_id
				where p.estabelecimento_id = ? and p.numero = 1
				""", Integer.class, casaBelt)).isEqualTo(1);
	}

	@Test
	void naoConfirmaPedidoEmOutraEtapa() throws Exception {
		jdbc.update("update pedido set status = 5, recusado_em = now(), motivo_recusa = 'Agenda cheia.' "
				+ "where estabelecimento_id = ? and numero = 2", casaBelt);

		confirmar(2).andExpect(status().isConflict());
		assertThat(jdbc.queryForObject("select status from pedido where estabelecimento_id = ? and numero = 2",
				Integer.class, casaBelt)).isEqualTo(5);
	}

	@Test
	void pedidoInexistenteOuDeOutroEstabelecimentoDa404() throws Exception {
		confirmar(999).andExpect(status().isNotFound());

		long outraLoja = jdbc.queryForObject("""
				insert into estabelecimento (nome, slug, telefone_whatsapp)
				values ('Doces da Ana', 'doces-da-ana-confirmar', '5511900000009') returning id
				""", Long.class);
		long ana = jdbc.queryForObject("""
				insert into usuario (estabelecimento_id, nome, email, senha_hash)
				values (?, 'Ana', 'ana@docesdaana.com', 'hash-de-teste') returning id
				""", Long.class, outraLoja);
		mockMvc.perform(post("/api/pedidos/1/confirmar")
			.header(HttpHeaders.AUTHORIZATION, "Bearer " + servicoToken.gerar(new UsuarioAutenticado(ana, outraLoja))))
			.andExpect(status().isNotFound());
		assertThat(jdbc.queryForObject("select status from pedido where estabelecimento_id = ? and numero = 1",
				Integer.class, casaBelt)).isEqualTo(1);
	}

	@Test
	void oPedidoConfirmadoMudaDeColunaNaListagem() throws Exception {
		confirmar(1).andExpect(status().isOk());

		mockMvc.perform(get("/api/pedidos").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
			.andExpect(jsonPath("$[?(@.numero == 1)].status").value(2));
	}

	@Test
	void exigeOToken() throws Exception {
		mockMvc.perform(post("/api/pedidos/1/confirmar")).andExpect(status().isUnauthorized());
	}

	private ResultActions confirmar(int numero) throws Exception {
		return mockMvc.perform(post("/api/pedidos/" + numero + "/confirmar")
			.header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
	}

	/** "sábado, 14/11, às 12h", a partir da data de retirada gravada no pedido. */
	private String dataEsperada(int numero) {
		LocalDateTime data = jdbc.queryForObject("select data_retirada from pedido where estabelecimento_id = ? and numero = ?",
				LocalDateTime.class, casaBelt, numero);
		return "%s, %02d/%02d, às %dh".formatted(data.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.forLanguageTag("pt-BR")),
				data.getDayOfMonth(), data.getMonthValue(), data.getHour());
	}

}
