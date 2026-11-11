package br.com.zappi.pedido;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.util.Map;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
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
import br.com.zappi.mensagem.MensagemWhatsappRepositorio;
import br.com.zappi.seguranca.ServicoToken;
import br.com.zappi.seguranca.UsuarioAutenticado;

/**
 * Se o log ou a mensagem falharem, a mudança de etapa inteira é desfeita (RN08). O teste não
 * usa transação própria, para ver o que de fato ficou no banco, e devolve o pedido #2 da V2
 * ao estado original no fim.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AndamentoPedidoRollbackTests {

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

	private long pedido;

	private String token;

	@BeforeEach
	void prepara() {
		Map<String, Object> lidia = jdbc.queryForMap(
				"select id, estabelecimento_id from usuario where email = 'lidia@casabelt.com'");
		long casaBelt = ((Number) lidia.get("estabelecimento_id")).longValue();
		token = servicoToken.gerar(new UsuarioAutenticado(((Number) lidia.get("id")).longValue(), casaBelt));
		pedido = jdbc.queryForObject("select id from pedido where estabelecimento_id = ? and numero = 2", Long.class,
				casaBelt);
	}

	@AfterEach
	void devolveOPedido() {
		jdbc.update("update pedido set status = 1, confirmado_em = null, producao_em = null, concluido_em = null where id = ?",
				pedido);
	}

	@Test
	void desfazAConclusaoSeOLogFalhar() {
		emProducao();
		logFalha();

		falhaCom("concluir", "log fora do ar");

		continuaEmProducao();
		assertThat(contarMensagens()).isZero();
	}

	@Test
	void desfazAConclusaoSeAMensagemFalhar() {
		emProducao();
		doThrow(new IllegalStateException("mensagem fora do ar")).when(mensagens).saveAndFlush(any());

		falhaCom("concluir", "mensagem fora do ar");

		continuaEmProducao();
		assertThat(jdbc.queryForObject("select count(*) from log_auditoria where acao = 'PEDIDO_STATUS_ALTERADO' "
				+ "and entidade_id = ?", Integer.class, pedido)).isZero();
	}

	@Test
	void desfazOInicioDaProducaoSeOLogFalhar() {
		jdbc.update("update pedido set status = 2, confirmado_em = now() where id = ?", pedido);
		logFalha();

		falhaCom("iniciar-producao", "log fora do ar");

		assertThat(status()).isEqualTo(2);
		assertThat(jdbc.queryForObject("select producao_em from pedido where id = ?", Object.class, pedido)).isNull();
	}

	@Test
	void desfazAVoltaSeOLogFalhar() {
		emProducao();
		logFalha();

		falhaCom("voltar-para-confirmado", "log fora do ar");

		continuaEmProducao();
		assertThat(jdbc.queryForObject("select producao_em from pedido where id = ?", Object.class, pedido)).isNotNull();
	}

	private void emProducao() {
		jdbc.update("update pedido set status = 3, confirmado_em = now(), producao_em = now() where id = ?", pedido);
	}

	private void logFalha() {
		doThrow(new IllegalStateException("log fora do ar")).when(auditoria).registrar(any(RegistroAuditoria.class));
	}

	private void falhaCom(String rota, String motivo) {
		assertThatThrownBy(() -> mockMvc.perform(post("/api/pedidos/2/" + rota)
			.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))).hasRootCauseMessage(motivo);
	}

	private void continuaEmProducao() {
		assertThat(status()).isEqualTo(3);
		assertThat(jdbc.queryForObject("select concluido_em from pedido where id = ?", Object.class, pedido)).isNull();
	}

	private int status() {
		return jdbc.queryForObject("select status from pedido where id = ?", Integer.class, pedido);
	}

	private int contarMensagens() {
		return jdbc.queryForObject("select count(*) from mensagem_whatsapp where pedido_id = ?", Integer.class, pedido);
	}

}
