package br.com.zappi.pedido;

import static br.com.zappi.pedido.CadastroPedidoTests.hoje;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterEach;
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
import br.com.zappi.pedido.RequisicaoPedido.ClienteDaRequisicao;
import br.com.zappi.pedido.RequisicaoPedido.ItemDaRequisicao;
import br.com.zappi.seguranca.ServicoToken;
import br.com.zappi.seguranca.UsuarioAutenticado;
import tools.jackson.databind.json.JsonMapper;

/**
 * O que de fato fica no banco no cadastro e na edição (ZAP-88, ZAP-90): sem transação própria
 * no teste, cada chamada grava de verdade, e o fim de cada teste apaga o que foi criado.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class CadastroPedidoConcorrenciaTests {

	private static final String CARLA = "5511988887777";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private ServicoToken servicoToken;

	@Autowired
	private JsonMapper json;

	@Autowired
	private ServicoCadastroPedido cadastro;

	@MockitoSpyBean
	private ServicoAuditoria auditoria;

	private UsuarioAutenticado lidia;

	private String token;

	private long brigadeiro;

	@BeforeEach
	void prepara() {
		Map<String, Object> usuario = jdbc.queryForMap(
				"select id, estabelecimento_id from usuario where email = 'lidia@casabelt.com'");
		lidia = new UsuarioAutenticado(((Number) usuario.get("id")).longValue(),
				((Number) usuario.get("estabelecimento_id")).longValue());
		token = servicoToken.gerar(lidia);
		brigadeiro = jdbc.queryForObject("select id from produto where sabor = 'Brigadeiro de chocolate'", Long.class);
	}

	@AfterEach
	void apaga() {
		jdbc.update("delete from pedido where numero > 2");
		jdbc.update("delete from cliente where telefone_whatsapp = ?", CARLA);
		jdbc.update("delete from log_auditoria where acao in ('PEDIDO_CRIADO', 'PEDIDO_EDITADO')");
	}

	@Test
	void cadastrosAoMesmoTempoRecebemNumerosSeguidos() throws Exception {
		int quantos = 4;
		RequisicaoPedido requisicao = new RequisicaoPedido(new ClienteDaRequisicao("Carla Nova", CARLA), true, hoje(),
				null, List.of(new ItemDaRequisicao(brigadeiro, BigDecimal.ONE, null, null, null)));
		CountDownLatch largada = new CountDownLatch(1);
		ExecutorService executor = Executors.newFixedThreadPool(quantos);
		try {
			List<Future<Integer>> numeros = new ArrayList<>();
			for (int i = 0; i < quantos; i++) {
				numeros.add(executor.submit(() -> {
					largada.await();
					return cadastro.cadastrar(lidia, requisicao).numero();
				}));
			}
			largada.countDown();
			List<Integer> recebidos = new ArrayList<>();
			for (Future<Integer> numero : numeros) {
				recebidos.add(numero.get(30, TimeUnit.SECONDS));
			}
			assertThat(recebidos).containsExactlyInAnyOrder(3, 4, 5, 6);
		}
		finally {
			executor.shutdownNow();
		}
		// O mesmo WhatsApp nos quatro cadastros: um cliente só
		assertThat(jdbc.queryForObject("select count(*) from cliente where telefone_whatsapp = ?", Integer.class, CARLA))
			.isEqualTo(1);
	}

	@Test
	void cadastroDesfeitoSeOLogFalhar() {
		doThrow(new IllegalStateException("log fora do ar")).when(auditoria).registrar(any(RegistroAuditoria.class));

		assertThatThrownBy(() -> mockMvc.perform(post("/api/pedidos").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
			.contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(CadastroPedidoTests.pedido("Carla Nova", CARLA, hoje(),
					List.of(CadastroPedidoTests.item(brigadeiro, 1, Map.of())))))))
			.hasRootCauseMessage("log fora do ar");

		assertThat(jdbc.queryForObject("select count(*) from pedido where numero > 2", Integer.class)).isZero();
		assertThat(jdbc.queryForObject("select count(*) from cliente where telefone_whatsapp = ?", Integer.class, CARLA))
			.isZero();
	}

	@Test
	void edicaoDesfeitaSeOLogFalhar() {
		long pedido = jdbc.queryForObject("select id from pedido where numero = 1", Long.class);
		LocalDate retirada = jdbc.queryForObject("select data_retirada from pedido where id = ?", LocalDate.class, pedido);
		doThrow(new IllegalStateException("log fora do ar")).when(auditoria).registrar(any(RegistroAuditoria.class));

		assertThatThrownBy(() -> mockMvc.perform(put("/api/pedidos/1").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
			.contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(CadastroPedidoTests.pedido("Carla Nova", CARLA, retirada.plusDays(1),
					List.of(CadastroPedidoTests.item(brigadeiro, 3, Map.of())))))))
			.hasRootCauseMessage("log fora do ar");

		assertThat(jdbc.queryForMap("select valor_total, data_retirada from pedido where id = ?", pedido))
			.containsEntry("data_retirada", java.sql.Date.valueOf(retirada))
			.satisfies(linha -> assertThat(((BigDecimal) linha.get("valor_total"))).isEqualByComparingTo("200.00"));
		assertThat(jdbc.queryForObject("select quantidade from item_pedido where pedido_id = ?", BigDecimal.class, pedido))
			.isEqualByComparingTo("2");
		assertThat(jdbc.queryForObject("select count(*) from cliente where telefone_whatsapp = ?", Integer.class, CARLA))
			.isZero();
	}

}
