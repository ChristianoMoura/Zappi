package br.com.zappi.pedido;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;

import br.com.zappi.TestcontainersConfiguration;
import br.com.zappi.auditoria.RegistroAuditoria;
import br.com.zappi.auditoria.ServicoAuditoria;
import br.com.zappi.seguranca.ServicoToken;
import br.com.zappi.seguranca.UsuarioAutenticado;

/**
 * Se o log falhar, a confirmação inteira é desfeita (RN08): o pedido continua Novo e a
 * mensagem não fica gravada. O teste não usa transação própria, para ver o que de fato ficou
 * no banco.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ConfirmarPedidoRollbackTests {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private ServicoToken servicoToken;

	@MockitoSpyBean
	private ServicoAuditoria auditoria;

	@Test
	void desfazTudoSeOLogFalhar() {
		Map<String, Object> lidia = jdbc.queryForMap(
				"select id, estabelecimento_id from usuario where email = 'lidia@casabelt.com'");
		long casaBelt = ((Number) lidia.get("estabelecimento_id")).longValue();
		String token = servicoToken.gerar(new UsuarioAutenticado(((Number) lidia.get("id")).longValue(), casaBelt));
		doThrow(new IllegalStateException("log fora do ar")).when(auditoria).registrar(any(RegistroAuditoria.class));

		assertThatThrownBy(() -> mockMvc.perform(post("/api/pedidos/1/confirmar")
			.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))).hasRootCauseMessage("log fora do ar");

		assertThat(jdbc.queryForMap("select status, confirmado_em from pedido where estabelecimento_id = ? and numero = 1",
				casaBelt))
			.containsEntry("confirmado_em", null)
			.satisfies(pedido -> assertThat(((Number) pedido.get("status")).intValue()).isEqualTo(1));
		assertThat(jdbc.queryForObject("""
				select count(*) from mensagem_whatsapp m join pedido p on p.id = m.pedido_id
				where p.estabelecimento_id = ? and p.numero = 1
				""", Integer.class, casaBelt)).isZero();
	}

}
