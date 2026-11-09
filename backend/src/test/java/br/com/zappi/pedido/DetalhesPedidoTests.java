package br.com.zappi.pedido;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
 * Detalhes do pedido (ZAP-45), a partir do pedido #1 da V2 (Ana, 2 kg de bolo de
 * brigadeiro com recheio e cobertura). Tudo é desfeito no fim de cada teste.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class DetalhesPedidoTests {

	private static final String CONFIRMACAO = "Olá, Ana!\n\nSeu pedido #1 na Casa Belt está confirmado.";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private ServicoToken servicoToken;

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
	void trazOPedidoCompletoComOsItens() throws Exception {
		detalhar(1)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.numero").value(1))
			.andExpect(jsonPath("$.status").value(1))
			.andExpect(jsonPath("$.observacao").value("Aniversário de 7 anos, tema unicórnio."))
			.andExpect(jsonPath("$.valorTotal").value(200.00))
			.andExpect(jsonPath("$.cliente.nome").value("Ana Exemplo"))
			.andExpect(jsonPath("$.cliente.telefone").value("5511900000001"))
			.andExpect(jsonPath("$.itens.length()").value(1))
			.andExpect(jsonPath("$.itens[0].sabor").value("Brigadeiro de chocolate"))
			.andExpect(jsonPath("$.itens[0].unidade").value("KG"))
			.andExpect(jsonPath("$.itens[0].quantidade").value(2.0))
			.andExpect(jsonPath("$.itens[0].precoUnitario").value(100.00))
			.andExpect(jsonPath("$.itens[0].subtotal").value(200.00))
			.andExpect(jsonPath("$.itens[0].recheio").value("Brigadeiro"))
			.andExpect(jsonPath("$.itens[0].cobertura").value("Granulado"))
			.andExpect(jsonPath("$.criadoEm").isString())
			.andExpect(jsonPath("$.mensagens.length()").value(0));
	}

	@Test
	void trazAsMensagensComOLinkDoWhatsapp() throws Exception {
		long pedido = idDoPedido(1);
		jdbc.update("update pedido set status = 2, confirmado_em = now() where id = ?", pedido);
		jdbc.update("""
				insert into mensagem_whatsapp (pedido_id, tipo, telefone_destino, conteudo, status, enviado_em)
				values (?, 1, '5511900000001', ?, 2, now())
				""", pedido, CONFIRMACAO);

		detalhar(1)
			.andExpect(jsonPath("$.status").value(2))
			.andExpect(jsonPath("$.confirmadoEm").isString())
			.andExpect(jsonPath("$.mensagens.length()").value(1))
			.andExpect(jsonPath("$.mensagens[0].tipo").value("CONFIRMACAO"))
			.andExpect(jsonPath("$.mensagens[0].status").value("ENVIADA"))
			.andExpect(jsonPath("$.mensagens[0].texto").value(CONFIRMACAO))
			.andExpect(jsonPath("$.mensagens[0].enviadoEm").isString())
			.andExpect(jsonPath("$.mensagens[0].link").value(
					"https://wa.me/5511900000001?text=Ol%C3%A1%2C%20Ana%21%0A%0ASeu%20pedido%20%231%20na%20Casa%20Belt%20est%C3%A1%20confirmado."));
	}

	@Test
	void mostraOMotivoEAsMensagensDeUmPedidoRecusado() throws Exception {
		long pedido = idDoPedido(2);
		jdbc.update("update pedido set status = 5, recusado_em = now(), motivo_recusa = 'Agenda cheia.' where id = ?",
				pedido);
		jdbc.update("""
				insert into mensagem_whatsapp (pedido_id, tipo, telefone_destino, conteudo, status)
				values (?, 2, '5511900000002', 'Motivo: Agenda cheia.', 1)
				""", pedido);

		detalhar(2)
			.andExpect(jsonPath("$.status").value(5))
			.andExpect(jsonPath("$.motivoRecusa").value("Agenda cheia."))
			.andExpect(jsonPath("$.cancelado").value(false))
			.andExpect(jsonPath("$.mensagens[*].tipo", contains("RECUSA")))
			.andExpect(jsonPath("$.mensagens[0].status").value("PENDENTE"))
			.andExpect(jsonPath("$.mensagens[0].enviadoEm").value(nullValue()));
	}

	@Test
	void naoExpoeOsDadosDoClienteAnonimizadoNemNoLink() throws Exception {
		long pedido = idDoPedido(1);
		jdbc.update("""
				update cliente set nome = 'Cliente anonimizado', telefone_whatsapp = '0000000000001', anonimizado_em = now()
				where id = (select cliente_id from pedido where id = ?)
				""", pedido);
		jdbc.update("""
				insert into mensagem_whatsapp (pedido_id, tipo, telefone_destino, conteudo, status)
				values (?, 1, '0000000000001', 'Seu pedido #1 está confirmado.', 2)
				""", pedido);

		detalhar(1)
			.andExpect(jsonPath("$.cliente.nome").value("Cliente anonimizado"))
			.andExpect(jsonPath("$.cliente.telefone").value(nullValue()))
			.andExpect(jsonPath("$.cliente.anonimizado").value(true))
			.andExpect(jsonPath("$.mensagens[0].link").value(nullValue()));
	}

	@Test
	void numeroInexistenteOuDeOutroEstabelecimentoDa404() throws Exception {
		detalhar(999).andExpect(status().isNotFound()).andExpect(jsonPath("$.codigo").value("PEDIDO_NAO_ENCONTRADO"));

		long outraLoja = jdbc.queryForObject("""
				insert into estabelecimento (nome, slug, telefone_whatsapp)
				values ('Doces da Ana', 'doces-da-ana-detalhes', '5511900000009') returning id
				""", Long.class);
		long ana = jdbc.queryForObject("""
				insert into usuario (estabelecimento_id, nome, email, senha_hash)
				values (?, 'Ana', 'ana@docesdaana.com', 'hash-de-teste') returning id
				""", Long.class, outraLoja);
		mockMvc.perform(get("/api/pedidos/1")
			.header(HttpHeaders.AUTHORIZATION, "Bearer " + servicoToken.gerar(new UsuarioAutenticado(ana, outraLoja))))
			.andExpect(status().isNotFound());
	}

	@Test
	void aListagemNaoTrazAsMensagens() throws Exception {
		mockMvc.perform(get("/api/pedidos").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
			.andExpect(jsonPath("$[0].mensagens").doesNotExist());
	}

	@Test
	void exigeOToken() throws Exception {
		mockMvc.perform(get("/api/pedidos/1")).andExpect(status().isUnauthorized());
	}

	private ResultActions detalhar(int numero) throws Exception {
		return mockMvc.perform(get("/api/pedidos/" + numero).header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
	}

	private long idDoPedido(int numero) {
		return jdbc.queryForObject("select id from pedido where estabelecimento_id = ? and numero = ?", Long.class,
				casaBelt, numero);
	}

}
