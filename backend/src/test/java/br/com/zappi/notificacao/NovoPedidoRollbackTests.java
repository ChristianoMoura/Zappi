package br.com.zappi.notificacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyShort;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;

import br.com.zappi.TestcontainersConfiguration;
import tools.jackson.databind.json.JsonMapper;

/**
 * O aviso de novo pedido é gravado na mesma transação do pedido do portal (ZAP-172, ZAP-176):
 * se a notificação falhar, o pedido, o cliente e a notificação são desfeitos juntos. O teste
 * não usa transação própria, para ver o que de fato ficou no banco.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class NovoPedidoRollbackTests {

	private static final String TELEFONE = "5511977776666";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private JsonMapper json;

	@MockitoSpyBean
	private NotificacaoRepositorio notificacoes;

	private long casaBelt;

	@BeforeEach
	void prepara() {
		casaBelt = jdbc.queryForObject("select id from estabelecimento where slug = 'casa-belt'", Long.class);
	}

	@Test
	void seANotificacaoFalharOPedidoDoPortalTambemEDesfeito() {
		doThrow(new IllegalStateException("notificação fora do ar")).when(notificacoes)
			.gravarSeNaoExiste(anyLong(), anyLong(), anyShort(), any());
		int pedidosAntes = pedidosDaLoja();
		int notificacoesAntes = jdbc.queryForObject("select count(*) from notificacao", Integer.class);

		assertThatThrownBy(() -> mockMvc.perform(post("/api/cardapio/casa-belt/pedidos")
			.contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(pedido())))).hasRootCauseMessage("notificação fora do ar");

		assertThat(pedidosDaLoja()).isEqualTo(pedidosAntes);
		assertThat(jdbc.queryForObject("select count(*) from notificacao", Integer.class)).isEqualTo(notificacoesAntes);
		assertThat(jdbc.queryForObject("select count(*) from cliente where telefone_whatsapp = ?", Integer.class,
				TELEFONE)).isZero();
	}

	private int pedidosDaLoja() {
		return jdbc.queryForObject("select count(*) from pedido where estabelecimento_id = ?", Integer.class, casaBelt);
	}

	private Map<String, Object> pedido() {
		long produto = jdbc.queryForObject("""
				select id from produto where estabelecimento_id = ? and ativo and no_cardapio order by id limit 1
				""", Long.class, casaBelt);
		return Map.of("cliente", Map.of("nome", "Duda Teste", "telefone", TELEFONE), "consentimentoLgpd", true,
				"dataRetirada", LocalDate.now(ZoneId.of("America/Sao_Paulo")).plusDays(7).atTime(15, 0).toString(),
				"observacao", "", "itens", List.of(Map.of("produtoId", produto, "quantidade", 1)), "formaPagamento",
				"PIX");
	}

}
