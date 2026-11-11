package br.com.zappi.pedido;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;

import br.com.zappi.TestcontainersConfiguration;
import br.com.zappi.auditoria.RegistroAuditoria;
import br.com.zappi.auditoria.ServicoAuditoria;
import br.com.zappi.mensagem.MensagemWhatsappRepositorio;
import br.com.zappi.seguranca.ServicoToken;
import br.com.zappi.seguranca.UsuarioAutenticado;

/**
 * Se o log ou a mensagem falharem, a recusa inteira é desfeita (RN08): o pedido continua Novo,
 * sem motivo e sem mensagem. O teste não usa transação própria, para ver o que de fato ficou
 * no banco.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class RecusarPedidoRollbackTests {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private ServicoToken servicoToken;

	@MockitoSpyBean
	private ServicoAuditoria auditoria;

	@MockitoSpyBean
	private MensagemWhatsappRepositorio mensagens;

	private long casaBelt;

	private String token;

	@BeforeEach
	void prepara() {
		Map<String, Object> lidia = jdbc.queryForMap(
				"select id, estabelecimento_id from usuario where email = 'lidia@casabelt.com'");
		casaBelt = ((Number) lidia.get("estabelecimento_id")).longValue();
		token = servicoToken.gerar(new UsuarioAutenticado(((Number) lidia.get("id")).longValue(), casaBelt));
	}

	@Test
	void desfazTudoSeOLogFalhar() {
		doThrow(new IllegalStateException("log fora do ar")).when(auditoria).registrar(any(RegistroAuditoria.class));

		recusarFalhaCom("log fora do ar");

		nadaFoiGravado();
	}

	@Test
	void desfazTudoSeAMensagemFalhar() {
		doThrow(new IllegalStateException("mensagem fora do ar")).when(mensagens).saveAndFlush(any());

		recusarFalhaCom("mensagem fora do ar");

		nadaFoiGravado();
		assertThat(jdbc.queryForObject("""
				select count(*) from log_auditoria l join pedido p on p.id = l.entidade_id
				where l.acao = 'PEDIDO_RECUSADO' and p.estabelecimento_id = ? and p.numero = 2
				""", Integer.class, casaBelt)).isZero();
	}

	private void recusarFalhaCom(String motivo) {
		assertThatThrownBy(() -> mockMvc.perform(post("/api/pedidos/2/recusar")
			.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"motivo\": \"Agenda cheia.\"}"))).hasRootCauseMessage(motivo);
	}

	private void nadaFoiGravado() {
		Map<String, Object> pedido = jdbc.queryForMap(
				"select status, motivo_recusa, recusado_em from pedido where estabelecimento_id = ? and numero = 2", casaBelt);
		assertThat(((Number) pedido.get("status")).intValue()).isEqualTo(1);
		assertThat(pedido).containsEntry("motivo_recusa", null).containsEntry("recusado_em", null);
		assertThat(jdbc.queryForObject("""
				select count(*) from mensagem_whatsapp m join pedido p on p.id = m.pedido_id
				where p.estabelecimento_id = ? and p.numero = 2
				""", Integer.class, casaBelt)).isZero();
	}

}
