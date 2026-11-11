package br.com.zappi.pedido;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
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
 * Concluir pedido com a mensagem de pronto (ZAP-76), com o pedido #2 da V2 (Bruno, R$ 292,50)
 * posto em produção. Tudo é desfeito no fim de cada teste.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class ConcluirPedidoTests {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private ServicoToken servicoToken;

	private long casaBelt;

	private long pedido;

	private String token;

	@BeforeEach
	void prepara() {
		Map<String, Object> lidia = jdbc.queryForMap(
				"select id, estabelecimento_id from usuario where email = 'lidia@casabelt.com'");
		casaBelt = ((Number) lidia.get("estabelecimento_id")).longValue();
		token = servicoToken.gerar(new UsuarioAutenticado(((Number) lidia.get("id")).longValue(), casaBelt));
		pedido = jdbc.queryForObject("select id from pedido where estabelecimento_id = ? and numero = 2", Long.class,
				casaBelt);
		jdbc.update("update pedido set status = 3, confirmado_em = now(), producao_em = now() where id = ?", pedido);
	}

	@Test
	void concluiComAMensagemDeProntoParaEnviar() throws Exception {
		String texto = """
				Olá, Bruno!

				Seu pedido #2 está pronto para retirada.

				Retirada: %s
				Total a pagar na retirada: R$ 292,50

				Qualquer dúvida, é só responder esta mensagem.

				Casa Belt
				Mensagem gerada pelo Zappi""".formatted(dataEsperada());

		concluir()
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value(4))
			.andExpect(jsonPath("$.producaoEm").isString())
			.andExpect(jsonPath("$.concluidoEm").isString())
			.andExpect(jsonPath("$.mensagens.length()").value(1))
			.andExpect(jsonPath("$.mensagens[0].tipo").value("PRONTO"))
			.andExpect(jsonPath("$.mensagens[0].status").value("PENDENTE"))
			.andExpect(jsonPath("$.mensagens[0].texto").value(texto))
			.andExpect(jsonPath("$.mensagens[0].link", startsWith("https://wa.me/5511900000002?text=Ol%C3%A1%2C%20Bruno%21")));

		assertThat(jdbc.queryForObject("select telefone_destino from mensagem_whatsapp where pedido_id = ?", String.class,
				pedido)).isEqualTo("5511900000002");
		assertThat(jdbc.queryForMap("""
				select detalhes ->> 'statusAntes' as antes, detalhes ->> 'statusDepois' as depois
				from log_auditoria where acao = 'PEDIDO_STATUS_ALTERADO' and entidade_id = ?
				""", pedido)).containsEntry("antes", "EM_PRODUCAO").containsEntry("depois", "CONCLUIDO");
	}

	@Test
	void concluirDeNovoDepoisDeUmaVoltaGeraOutraMensagem() throws Exception {
		concluir().andExpect(status().isOk());
		mockMvc.perform(post("/api/pedidos/2/voltar-para-producao").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
			.andExpect(status().isOk());

		concluir()
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value(4))
			.andExpect(jsonPath("$.mensagens[*].tipo", contains("PRONTO", "PRONTO")));
	}

	@Test
	void soConcluiPedidoEmProducao() throws Exception {
		jdbc.update("update pedido set status = 2, producao_em = null where id = ?", pedido);

		concluir()
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.mensagem").value("Só pedidos em produção podem ser concluídos."));
		assertThat(jdbc.queryForObject("select count(*) from mensagem_whatsapp where pedido_id = ?", Integer.class,
				pedido)).isZero();
	}

	@Test
	void naoConcluiDuasVezes() throws Exception {
		concluir().andExpect(status().isOk());

		concluir().andExpect(status().isConflict());
		assertThat(jdbc.queryForObject("select count(*) from mensagem_whatsapp where pedido_id = ?", Integer.class,
				pedido)).isEqualTo(1);
	}

	@Test
	void pedidoInexistenteOuDeOutroEstabelecimentoDa404() throws Exception {
		mockMvc.perform(post("/api/pedidos/999/concluir").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
			.andExpect(status().isNotFound());

		long outraLoja = jdbc.queryForObject("""
				insert into estabelecimento (nome, slug, telefone_whatsapp)
				values ('Doces da Ana', 'doces-da-ana-concluir', '5511900000009') returning id
				""", Long.class);
		long ana = jdbc.queryForObject("""
				insert into usuario (estabelecimento_id, nome, email, senha_hash)
				values (?, 'Ana', 'ana@docesdaana.com', 'hash-de-teste') returning id
				""", Long.class, outraLoja);
		mockMvc.perform(post("/api/pedidos/2/concluir")
			.header(HttpHeaders.AUTHORIZATION, "Bearer " + servicoToken.gerar(new UsuarioAutenticado(ana, outraLoja))))
			.andExpect(status().isNotFound());
		assertThat(jdbc.queryForObject("select status from pedido where id = ?", Integer.class, pedido)).isEqualTo(3);
	}

	@Test
	void exigeOToken() throws Exception {
		mockMvc.perform(post("/api/pedidos/2/concluir")).andExpect(status().isUnauthorized());
	}

	private ResultActions concluir() throws Exception {
		return mockMvc.perform(post("/api/pedidos/2/concluir").header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
	}

	private String dataEsperada() {
		LocalDateTime data = jdbc.queryForObject("select data_retirada from pedido where id = ?", LocalDateTime.class, pedido);
		return "%s, %02d/%02d, às %dh".formatted(data.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.forLanguageTag("pt-BR")),
				data.getDayOfMonth(), data.getMonthValue(), data.getHour());
	}

}
