package br.com.zappi.pedido;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
 * Iniciar produção e voltar coluna (ZAP-75), a partir do pedido #1 da V2 posto em cada etapa.
 * Nenhuma dessas mudanças gera mensagem. Tudo é desfeito no fim de cada teste.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class AndamentoPedidoTests {

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
		pedido = jdbc.queryForObject("select id from pedido where estabelecimento_id = ? and numero = 1", Long.class,
				casaBelt);
	}

	@Test
	void iniciaAProducaoDeUmPedidoConfirmado() throws Exception {
		etapa("status = 2, confirmado_em = now()");

		acao("iniciar-producao")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value(3))
			.andExpect(jsonPath("$.confirmadoEm").isString())
			.andExpect(jsonPath("$.producaoEm").isString())
			.andExpect(jsonPath("$.mensagens.length()").value(0))
			.andExpect(jsonPath("$.avisoDeProntoEnviado").doesNotExist());

		assertThat(log()).containsEntry("antes", "CONFIRMADO").containsEntry("depois", "EM_PRODUCAO");
	}

	@Test
	void voltaParaConfirmadoApagandoAProducao() throws Exception {
		etapa("status = 3, confirmado_em = now(), producao_em = now()");

		acao("voltar-para-confirmado")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value(2))
			.andExpect(jsonPath("$.confirmadoEm").isString())
			.andExpect(jsonPath("$.producaoEm").value(nullValue()));

		assertThat(jdbc.queryForObject("select producao_em from pedido where id = ?", Object.class, pedido)).isNull();
		assertThat(log()).containsEntry("antes", "EM_PRODUCAO").containsEntry("depois", "CONFIRMADO");
	}

	@Test
	void voltaParaProducaoApagandoSoAConclusao() throws Exception {
		etapa("status = 4, confirmado_em = now(), producao_em = now(), concluido_em = now()");

		acao("voltar-para-producao")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value(3))
			.andExpect(jsonPath("$.producaoEm").isString())
			.andExpect(jsonPath("$.concluidoEm").value(nullValue()))
			.andExpect(jsonPath("$.avisoDeProntoEnviado").value(false));

		assertThat(log()).containsEntry("antes", "CONCLUIDO").containsEntry("depois", "EM_PRODUCAO");
	}

	@Test
	void avisaQuandoOProntoJaTinhaSidoEnviado() throws Exception {
		etapa("status = 4, confirmado_em = now(), producao_em = now(), concluido_em = now()");
		jdbc.update("""
				insert into mensagem_whatsapp (pedido_id, tipo, telefone_destino, conteudo, status, enviado_em)
				values (?, 3, '5511900000001', 'Seu pedido #1 está pronto.', 2, now())
				""", pedido);

		acao("voltar-para-producao").andExpect(status().isOk()).andExpect(jsonPath("$.avisoDeProntoEnviado").value(true));
	}

	@Test
	void naoAvisaQuandoOProntoAindaEstavaPendente() throws Exception {
		etapa("status = 4, confirmado_em = now(), producao_em = now(), concluido_em = now()");
		jdbc.update("""
				insert into mensagem_whatsapp (pedido_id, tipo, telefone_destino, conteudo, status)
				values (?, 3, '5511900000001', 'Seu pedido #1 está pronto.', 1)
				""", pedido);

		acao("voltar-para-producao").andExpect(jsonPath("$.avisoDeProntoEnviado").value(false));
	}

	@Test
	void recusaTransicoesForaDaOrdem() throws Exception {
		// O pedido #1 está Novo: nada volta para antes da confirmação (RN03)
		acao("iniciar-producao").andExpect(status().isConflict())
			.andExpect(jsonPath("$.mensagem").value("Só pedidos confirmados podem entrar em produção."));
		acao("voltar-para-confirmado").andExpect(status().isConflict())
			.andExpect(jsonPath("$.mensagem").value("Só pedidos em produção podem voltar para confirmado."));
		acao("voltar-para-producao").andExpect(status().isConflict())
			.andExpect(jsonPath("$.mensagem").value("Só pedidos concluídos podem voltar para produção."));

		etapa("status = 5, recusado_em = now(), motivo_recusa = 'Agenda cheia.'");
		acao("iniciar-producao").andExpect(status().isConflict());
		acao("voltar-para-producao").andExpect(status().isConflict());

		assertThat(jdbc.queryForObject("select count(*) from log_auditoria where acao = 'PEDIDO_STATUS_ALTERADO' "
				+ "and entidade_id = ?", Integer.class, pedido)).isZero();
	}

	@Test
	void pedidoInexistenteOuDeOutroEstabelecimentoDa404() throws Exception {
		mockMvc.perform(post("/api/pedidos/999/iniciar-producao").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
			.andExpect(status().isNotFound());

		etapa("status = 2, confirmado_em = now()");
		long outraLoja = jdbc.queryForObject("""
				insert into estabelecimento (nome, slug, telefone_whatsapp)
				values ('Doces da Ana', 'doces-da-ana-andamento', '5511900000009') returning id
				""", Long.class);
		long ana = jdbc.queryForObject("""
				insert into usuario (estabelecimento_id, nome, email, senha_hash)
				values (?, 'Ana', 'ana@docesdaana.com', 'hash-de-teste') returning id
				""", Long.class, outraLoja);
		mockMvc.perform(post("/api/pedidos/1/iniciar-producao")
			.header(HttpHeaders.AUTHORIZATION, "Bearer " + servicoToken.gerar(new UsuarioAutenticado(ana, outraLoja))))
			.andExpect(status().isNotFound());
		assertThat(jdbc.queryForObject("select status from pedido where id = ?", Integer.class, pedido)).isEqualTo(2);
	}

	@Test
	void exigeOToken() throws Exception {
		mockMvc.perform(post("/api/pedidos/1/iniciar-producao")).andExpect(status().isUnauthorized());
		mockMvc.perform(post("/api/pedidos/1/voltar-para-confirmado")).andExpect(status().isUnauthorized());
		mockMvc.perform(post("/api/pedidos/1/voltar-para-producao")).andExpect(status().isUnauthorized());
	}

	private ResultActions acao(String rota) throws Exception {
		return mockMvc.perform(post("/api/pedidos/1/" + rota).header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
	}

	private void etapa(String campos) {
		jdbc.update("update pedido set " + campos + " where id = ?", pedido);
	}

	private Map<String, Object> log() {
		return jdbc.queryForMap("""
				select detalhes ->> 'statusAntes' as antes, detalhes ->> 'statusDepois' as depois
				from log_auditoria where acao = 'PEDIDO_STATUS_ALTERADO' and entidade_id = ?
				""", pedido);
	}

}
