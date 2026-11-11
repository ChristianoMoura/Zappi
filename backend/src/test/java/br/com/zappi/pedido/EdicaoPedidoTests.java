package br.com.zappi.pedido;

import static br.com.zappi.pedido.CadastroPedidoTests.hoje;
import static br.com.zappi.pedido.CadastroPedidoTests.item;
import static br.com.zappi.pedido.CadastroPedidoTests.pedido;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.List;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import br.com.zappi.TestcontainersConfiguration;
import br.com.zappi.seguranca.ServicoToken;
import br.com.zappi.seguranca.UsuarioAutenticado;
import tools.jackson.databind.json.JsonMapper;

/**
 * Edição do pedido (ZAP-90), a partir do pedido #1 da V2 (Ana, 2 kg de bolo de brigadeiro a
 * R$ 100,00/kg) posto em cada etapa. Tudo é desfeito no fim de cada teste.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class EdicaoPedidoTests {

	private static final String ANA = "5511900000001";

	private static final String BRUNO = "5511900000002";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private ServicoToken servicoToken;

	@Autowired
	private JsonMapper json;

	private long casaBelt;

	private String token;

	private long pedido;

	private LocalDateTime retirada;

	private long brigadeiro;

	private long ninho;

	@BeforeEach
	void prepara() {
		Map<String, Object> lidia = jdbc.queryForMap(
				"select id, estabelecimento_id from usuario where email = 'lidia@casabelt.com'");
		casaBelt = ((Number) lidia.get("estabelecimento_id")).longValue();
		token = servicoToken.gerar(new UsuarioAutenticado(((Number) lidia.get("id")).longValue(), casaBelt));
		pedido = jdbc.queryForObject("select id from pedido where estabelecimento_id = ? and numero = 1", Long.class,
				casaBelt);
		retirada = jdbc.queryForObject("select data_retirada from pedido where id = ?", LocalDateTime.class, pedido);
		brigadeiro = produto("Brigadeiro de chocolate");
		ninho = produto("Ninho com morango");
	}

	@Test
	void mantemOPrecoCongeladoEUsaOAtualNosItensNovos() throws Exception {
		// O cardápio mudou depois do pedido: o item que já estava continua com o preço da época (RN10)
		jdbc.update("update produto set preco = 150.00 where id in (?, ?)", brigadeiro, ninho);
		Map<String, Object> corpo = pedido("Ana Exemplo", ANA, retirada.plusDays(1),
				List.of(item(brigadeiro, 3, Map.of("recheio", "Brigadeiro")), item(ninho, 1, Map.of())));
		corpo.put("observacao", "  ");

		editar(1, corpo)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.numero").value(1))
			.andExpect(jsonPath("$.status").value(1))
			.andExpect(jsonPath("$.dataRetirada", startsWith(retirada.plusDays(1).toString())))
			.andExpect(jsonPath("$.observacao").value(nullValue()))
			.andExpect(jsonPath("$.itens.length()").value(2))
			.andExpect(jsonPath("$.itens[0].produtoId").value(brigadeiro))
			.andExpect(jsonPath("$.itens[0].precoUnitario").value(100.00))
			.andExpect(jsonPath("$.itens[0].subtotal").value(300.00))
			.andExpect(jsonPath("$.itens[0].cobertura").value(nullValue()))
			.andExpect(jsonPath("$.itens[1].produtoId").value(ninho))
			.andExpect(jsonPath("$.itens[1].precoUnitario").value(150.00))
			.andExpect(jsonPath("$.valorTotal").value(450.00));
	}

	@Test
	void itemQueSaiDoFormularioSaiDoPedido() throws Exception {
		editar(1, pedido("Ana Exemplo", ANA, retirada, List.of(item(ninho, 1, Map.of()))))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.itens.length()").value(1))
			.andExpect(jsonPath("$.itens[0].produtoId").value(ninho))
			.andExpect(jsonPath("$.valorTotal").value(115.00));

		assertThat(jdbc.queryForObject("select count(*) from item_pedido where pedido_id = ?", Integer.class, pedido))
			.isEqualTo(1);
	}

	@Test
	void itemDeProdutoQueSaiuDoCardapioPodeFicarMasNaoEntrar() throws Exception {
		jdbc.update("update produto set ativo = false where id in (?, ?)", brigadeiro, ninho);

		editar(1, pedido("Ana Exemplo", ANA, retirada, List.of(item(brigadeiro, 1, Map.of()))))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.itens[0].precoUnitario").value(100.00))
			.andExpect(jsonPath("$.valorTotal").value(100.00));

		editar(1, pedido("Ana Exemplo", ANA, retirada, List.of(item(brigadeiro, 1, Map.of()), item(ninho, 1, Map.of()))))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos['itens[1].produtoId']").value("Escolha um produto do cardápio."));
	}

	@Test
	void doisItensDoMesmoProdutoMantemUmPrecoCongelado() throws Exception {
		jdbc.update("update produto set preco = 150.00 where id = ?", brigadeiro);

		editar(1, pedido("Ana Exemplo", ANA, retirada,
				List.of(item(brigadeiro, 2, Map.of()), item(brigadeiro, 1, Map.of("recheio", "Ninho")))))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.itens[0].precoUnitario").value(100.00))
			.andExpect(jsonPath("$.itens[1].precoUnitario").value(150.00))
			.andExpect(jsonPath("$.valorTotal").value(350.00));
	}

	@Test
	void corrigeONomeNoPedidoNovo() throws Exception {
		editar(1, pedido("Ana Souza", ANA, retirada, List.of(item(brigadeiro, 2, Map.of()))))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.cliente.nome").value("Ana Souza"));

		assertThat(jdbc.queryForObject("select nome from cliente where telefone_whatsapp = ?", String.class, ANA))
			.isEqualTo("Ana Souza");
	}

	@Test
	void trocaOClienteNoPedidoNovo() throws Exception {
		editar(1, pedido("Bruno", BRUNO, retirada, List.of(item(brigadeiro, 2, Map.of()))))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.cliente.nome").value("Bruno Exemplo"))
			.andExpect(jsonPath("$.cliente.telefone").value(BRUNO));

		editar(1, pedido("Carla Nova", "5511988887777", retirada, List.of(item(brigadeiro, 2, Map.of()))))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.cliente.nome").value("Carla Nova"));
		assertThat(jdbc.queryForObject("select consentimento_lgpd from cliente where telefone_whatsapp = '5511988887777'",
				Boolean.class)).isTrue();
		// A Ana continua cadastrada, só deixou de ser a cliente deste pedido
		assertThat(jdbc.queryForObject("select nome from cliente where telefone_whatsapp = ?", String.class, ANA))
			.isEqualTo("Ana Exemplo");
	}

	@Test
	void depoisDaConfirmacaoOClienteNaoMuda() throws Exception {
		confirmar();

		editar(1, pedido("Bruno", BRUNO, retirada, List.of(item(brigadeiro, 2, Map.of()))))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.codigo").value("TRANSICAO_NAO_PERMITIDA"))
			.andExpect(jsonPath("$.mensagem").value("O cliente não pode ser trocado depois da confirmação."));

		// O nome que vier é ignorado: a mensagem já foi gerada para este cliente
		editar(1, pedido("Ana Souza", ANA, retirada, List.of(item(brigadeiro, 2, Map.of()))))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.cliente.nome").value("Ana Exemplo"));
	}

	@Test
	void naoEditaPedidoConcluidoOuRecusado() throws Exception {
		etapa("status = 4, confirmado_em = now(), producao_em = now(), concluido_em = now()");
		editar(1, pedido("Ana Exemplo", ANA, retirada, List.of(item(brigadeiro, 3, Map.of()))))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.mensagem").value("Pedidos concluídos ou recusados não podem ser editados."));

		etapa("status = 5, concluido_em = null, recusado_em = now(), motivo_recusa = 'Agenda cheia.'");
		editar(1, pedido("Ana Exemplo", ANA, retirada, List.of(item(brigadeiro, 3, Map.of()))))
			.andExpect(status().isConflict());

		assertThat(jdbc.queryForObject("select valor_total from pedido where id = ?", Double.class, pedido))
			.isEqualTo(200.0);
	}

	@Test
	void editaEmProducaoSemMexerNasMensagens() throws Exception {
		confirmar();
		mockMvc.perform(post("/api/pedidos/1/iniciar-producao").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
			.andExpect(status().isOk());

		editar(1, pedido("Ana Exemplo", ANA, retirada, List.of(item(brigadeiro, 3, Map.of()))))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value(3))
			.andExpect(jsonPath("$.valorTotal").value(300.00))
			.andExpect(jsonPath("$.mensagens.length()").value(1))
			.andExpect(jsonPath("$.mensagens[0].texto", containsString("Total: R$ 200,00")));
	}

	@Test
	void naoDeixaMudarParaUmaDataQueJaPassou() throws Exception {
		editar(1, pedido("Ana Exemplo", ANA, hoje().minusDays(1), List.of(item(brigadeiro, 2, Map.of()))))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.dataRetirada")
				.value("A data e o horário de retirada já passaram. Escolha um horário a partir de agora."));
	}

	@Test
	void trocaSoOHorarioDentroDaFaixaPermitida() throws Exception {
		editar(1, pedido("Ana Exemplo", ANA, retirada.withHour(20).withMinute(30), List.of(item(brigadeiro, 2, Map.of()))))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.dataRetirada").value("Escolha um horário entre 8h e 20h, de 30 em 30 minutos."));

		editar(1, pedido("Ana Exemplo", ANA, retirada.withHour(9).withMinute(30), List.of(item(brigadeiro, 2, Map.of()))))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.dataRetirada", startsWith(retirada.toLocalDate() + "T09:30")));
	}

	@Test
	void aDataQueJaPassouPodeFicarSeNaoFoiMudada() throws Exception {
		LocalDateTime passada = hoje().minusDays(2).atTime(12, 0);
		jdbc.update("update pedido set data_retirada = ? where id = ?", passada, pedido);
		editar(1, pedido("Ana Exemplo", ANA, passada, List.of(item(brigadeiro, 3, Map.of()))))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.dataRetirada", startsWith(passada.toString())));
	}

	@Test
	void atualizaAConfirmacaoQueAindaNaoFoiEnviada() throws Exception {
		long mensagem = confirmar();

		editar(1, pedido("Ana Exemplo", ANA, retirada, List.of(item(brigadeiro, 3, Map.of()))))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.mensagens.length()").value(1))
			.andExpect(jsonPath("$.mensagens[0].id").value(mensagem))
			.andExpect(jsonPath("$.mensagens[0].status").value("PENDENTE"))
			.andExpect(jsonPath("$.mensagens[0].texto", containsString("- Bolo de brigadeiro de chocolate (3 kg)")))
			.andExpect(jsonPath("$.mensagens[0].texto", containsString("Total: R$ 300,00")))
			.andExpect(jsonPath("$.mensagens[0].link", containsString("3%20kg")));

		assertThat(jdbc.queryForObject("select detalhes ->> 'mensagemId' from log_auditoria where acao = 'PEDIDO_EDITADO'",
				Long.class)).isEqualTo(mensagem);
	}

	@Test
	void geraOutraConfirmacaoQuandoAAnteriorJaFoiEnviada() throws Exception {
		long mensagem = confirmar();
		enviada(mensagem);

		editar(1, pedido("Ana Exemplo", ANA, retirada, List.of(item(brigadeiro, 3, Map.of()))))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.mensagens.length()").value(2))
			.andExpect(jsonPath("$.mensagens[0].status").value("ENVIADA"))
			.andExpect(jsonPath("$.mensagens[0].texto", containsString("Total: R$ 200,00")))
			.andExpect(jsonPath("$.mensagens[1].tipo").value("CONFIRMACAO"))
			.andExpect(jsonPath("$.mensagens[1].status").value("PENDENTE"))
			.andExpect(jsonPath("$.mensagens[1].texto", containsString("Total: R$ 300,00")));
	}

	@Test
	void semMudancaNoTextoNaoGeraOutraConfirmacao() throws Exception {
		long mensagem = confirmar();
		enviada(mensagem);
		Map<String, Object> corpo = pedido("Ana Exemplo", ANA, retirada, List.of(item(brigadeiro, 2, Map.of())));
		// A observação não aparece na mensagem
		corpo.put("observacao", "Tema unicórnio, com vela.");

		editar(1, corpo)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.observacao").value("Tema unicórnio, com vela."))
			.andExpect(jsonPath("$.mensagens.length()").value(1));
	}

	@Test
	void editadoEmProducaoAtualizaAConfirmacaoAoVoltarParaConfirmado() throws Exception {
		long mensagem = confirmar();
		enviada(mensagem);
		mockMvc.perform(post("/api/pedidos/1/iniciar-producao").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
			.andExpect(status().isOk());
		editar(1, pedido("Ana Exemplo", ANA, retirada, List.of(item(brigadeiro, 3, Map.of()))))
			.andExpect(status().isOk());

		mockMvc.perform(post("/api/pedidos/1/voltar-para-confirmado").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value(2))
			.andExpect(jsonPath("$.mensagens.length()").value(2))
			.andExpect(jsonPath("$.mensagens[1].status").value("PENDENTE"))
			.andExpect(jsonPath("$.mensagens[1].texto", containsString("Total: R$ 300,00")));
	}

	@Test
	void registraADataEAHoraNoAntesEDepois() throws Exception {
		LocalDateTime nova = retirada.plusDays(1).withHour(15).withMinute(30);

		editar(1, pedido("Ana Exemplo", ANA, nova, List.of(item(brigadeiro, 2, Map.of())))).andExpect(status().isOk());

		assertThat(jdbc.queryForMap("""
				select detalhes -> 'antes' ->> 'dataRetirada' as antes, detalhes -> 'depois' ->> 'dataRetirada' as depois
				from log_auditoria where acao = 'PEDIDO_EDITADO'
				""")).containsEntry("antes", retirada.toString()).containsEntry("depois", nova.toString());
	}

	@Test
	void registraOAntesEODepoisSemDadosPessoais() throws Exception {
		editar(1, pedido("Ana Exemplo", ANA, retirada, List.of(item(brigadeiro, 1.5, Map.of()))))
			.andExpect(status().isOk());

		Map<String, Object> log = jdbc.queryForMap("""
				select entidade_id, detalhes ->> 'status' as status,
				       detalhes -> 'antes' ->> 'valorTotal' as antes, detalhes -> 'depois' ->> 'valorTotal' as depois,
				       detalhes -> 'depois' -> 'itens' -> 0 ->> 'quantidade' as quantidade,
				       detalhes -> 'depois' ->> 'clienteId' as cliente, detalhes::text as tudo,
				       entidade, ip_origem, user_agent, criado_em
				from log_auditoria where acao = 'PEDIDO_EDITADO'
				""");
		assertThat(((Number) log.get("entidade_id")).longValue()).isEqualTo(pedido);
		assertThat(log).containsEntry("entidade", "pedido")
			.containsEntry("ip_origem", "127.0.0.1")
			.containsEntry("user_agent", CadastroPedidoTests.NAVEGADOR);
		assertThat(log.get("criado_em")).isNotNull();
		assertThat(log).containsEntry("status", "NOVO")
			.containsEntry("antes", "200.00")
			.containsEntry("depois", "150.00")
			.containsEntry("quantidade", "1.5");
		assertThat(log.get("cliente")).isNotNull();
		assertThat((String) log.get("tudo")).doesNotContain("Ana").doesNotContain(ANA);
	}

	@Test
	void pedidoInexistenteOuDeOutroEstabelecimentoDa404() throws Exception {
		editar(999, pedido("Ana Exemplo", ANA, retirada, List.of(item(brigadeiro, 3, Map.of()))))
			.andExpect(status().isNotFound());

		long outraLoja = jdbc.queryForObject("""
				insert into estabelecimento (nome, slug, telefone_whatsapp)
				values ('Doces da Ana', 'doces-da-ana-edicao', '5511900000009') returning id
				""", Long.class);
		long ana = jdbc.queryForObject("""
				insert into usuario (estabelecimento_id, nome, email, senha_hash)
				values (?, 'Ana', 'ana@docesdaana.com', 'hash-de-teste') returning id
				""", Long.class, outraLoja);
		mockMvc.perform(put("/api/pedidos/1")
			.header(HttpHeaders.AUTHORIZATION, "Bearer " + servicoToken.gerar(new UsuarioAutenticado(ana, outraLoja)))
			.contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(pedido("Ana Exemplo", ANA, retirada, List.of(item(brigadeiro, 3, Map.of()))))))
			.andExpect(status().isNotFound());
		assertThat(jdbc.queryForObject("select valor_total from pedido where id = ?", Double.class, pedido))
			.isEqualTo(200.0);
	}

	@Test
	void exigeOToken() throws Exception {
		mockMvc.perform(put("/api/pedidos/1").contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(pedido("Ana Exemplo", ANA, retirada, List.of(item(brigadeiro, 3, Map.of()))))))
			.andExpect(status().isUnauthorized());
	}

	private ResultActions editar(int numero, Map<String, Object> corpo) throws Exception {
		return mockMvc.perform(put("/api/pedidos/" + numero).header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
			.header(HttpHeaders.USER_AGENT, CadastroPedidoTests.NAVEGADOR)
			.contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(corpo)));
	}

	/** Confirma o pedido #1 pela API e devolve o id da mensagem de confirmação. */
	private long confirmar() throws Exception {
		mockMvc.perform(post("/api/pedidos/1/confirmar").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
			.andExpect(status().isOk());
		return jdbc.queryForObject("select id from mensagem_whatsapp where pedido_id = ?", Long.class, pedido);
	}

	private void enviada(long mensagem) throws Exception {
		mockMvc.perform(post("/api/pedidos/1/mensagens/" + mensagem + "/enviada")
			.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
			.andExpect(status().isOk());
	}

	private void etapa(String campos) {
		jdbc.update("update pedido set " + campos + " where id = ?", pedido);
	}

	private long produto(String sabor) {
		return jdbc.queryForObject("select id from produto where estabelecimento_id = ? and sabor = ?", Long.class,
				casaBelt, sabor);
	}

}
