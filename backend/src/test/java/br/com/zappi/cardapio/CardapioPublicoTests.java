package br.com.zappi.cardapio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import br.com.zappi.TestcontainersConfiguration;

/**
 * Cardápio público pelo link da loja, sem login (ZAP-104, RN02), com a Casa Belt e o cardápio
 * da V2. O Storage aponta para um endereço de teste, para conferir os endereços das fotos.
 * Tudo é desfeito no fim de cada teste.
 */
@SpringBootTest(properties = "zappi.armazenamento.url=https://storage.teste")
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class CardapioPublicoTests {

	private static final String CASA_BELT = "/api/cardapio/casa-belt";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcTemplate jdbc;

	private long casaBelt;

	@BeforeEach
	void prepara() {
		casaBelt = jdbc.queryForObject("select id from estabelecimento where slug = 'casa-belt'", Long.class);
	}

	@Test
	void mostraALojaEOsProdutosSemLogin() throws Exception {
		mockMvc.perform(get(CASA_BELT))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.estabelecimento.nome").value("Casa Belt"))
			.andExpect(jsonPath("$.estabelecimento.slug").value("casa-belt"))
			.andExpect(jsonPath("$.estabelecimento.descricao")
				.value("Confeitaria artesanal: bolos e salgados sob encomenda."))
			.andExpect(jsonPath("$.estabelecimento.whatsapp").value("5511900000000"))
			.andExpect(jsonPath("$.estabelecimento.logo").value(nullValue()))
			.andExpect(jsonPath("$.produtos[*].sabor", contains("Brigadeiro de chocolate", "Ninho com morango",
					"Cento de coxinha", "Coxinha por unidade")))
			.andExpect(jsonPath("$.produtos[0].id").isNumber())
			.andExpect(jsonPath("$.produtos[0].nome").value("Bolo"))
			.andExpect(jsonPath("$.produtos[0].unidade").value("KG"))
			.andExpect(jsonPath("$.produtos[0].preco").value(100.00))
			.andExpect(jsonPath("$.produtos[0].descricao")
				.value("Massa de chocolate, recheio de brigadeiro e cobertura de granulado."))
			.andExpect(jsonPath("$.produtos[0].foto").value(nullValue()))
			.andExpect(jsonPath("$.produtos[2].unidade").value("UN"));
	}

	@Test
	void soMostraOsProdutosAtivos() throws Exception {
		jdbc.update("update produto set ativo = false where estabelecimento_id = ? and sabor = 'Ninho com morango'",
				casaBelt);

		mockMvc.perform(get(CASA_BELT))
			.andExpect(jsonPath("$.produtos[*].sabor",
					contains("Brigadeiro de chocolate", "Cento de coxinha", "Coxinha por unidade")));
	}

	@Test
	void naoExpoeEnderecoEmailNemDadosInternos() throws Exception {
		jdbc.update("""
				update estabelecimento set email_contato = 'lidia@exemplo.com', cep = '01001000',
				       logradouro = 'Rua de Teste', numero = '10', bairro = 'Centro', cidade = 'São Paulo', uf = 'SP'
				where id = ?
				""", casaBelt);

		String corpo = mockMvc.perform(get(CASA_BELT))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.estabelecimento.emailContato").doesNotExist())
			.andExpect(jsonPath("$.estabelecimento.cep").doesNotExist())
			.andExpect(jsonPath("$.estabelecimento.logradouro").doesNotExist())
			.andExpect(jsonPath("$.estabelecimento.id").doesNotExist())
			.andExpect(jsonPath("$.produtos[0].ativo").doesNotExist())
			.andReturn()
			.getResponse()
			.getContentAsString();
		assertThat(corpo).doesNotContain("lidia@exemplo.com", "01001000", "Rua de Teste", "Exemplo");
	}

	@Test
	void mostraOEnderecoPublicoDasFotos() throws Exception {
		jdbc.update("update estabelecimento set logo_caminho = ?, capa_caminho = ? where id = ?",
				casaBelt + "/logo-abc.webp", casaBelt + "/capa-def.webp", casaBelt);
		jdbc.update("""
				update produto set foto_caminho = ?, foto_texto_alternativo = 'Bolo de brigadeiro com granulado'
				where estabelecimento_id = ? and sabor = 'Brigadeiro de chocolate'
				""", casaBelt + "/1-abcd.jpg", casaBelt);

		mockMvc.perform(get(CASA_BELT))
			.andExpect(jsonPath("$.estabelecimento.logo")
				.value("https://storage.teste/storage/v1/object/public/estabelecimentos/" + casaBelt + "/logo-abc.webp"))
			.andExpect(jsonPath("$.estabelecimento.capa")
				.value("https://storage.teste/storage/v1/object/public/estabelecimentos/" + casaBelt + "/capa-def.webp"))
			.andExpect(jsonPath("$.produtos[0].foto")
				.value("https://storage.teste/storage/v1/object/public/produtos/" + casaBelt + "/1-abcd.jpg"))
			.andExpect(jsonPath("$.produtos[0].textoAlternativo").value("Bolo de brigadeiro com granulado"));
	}

	@Test
	void cadaLinkMostraSoOCardapioDaPropriaLoja() throws Exception {
		long outraLoja = jdbc.queryForObject("""
				insert into estabelecimento (nome, slug, telefone_whatsapp)
				values ('Doces da Ana', 'doces-da-ana', '5511900000009') returning id
				""", Long.class);
		jdbc.update("""
				insert into produto (estabelecimento_id, unidade_medida_id, nome, sabor, preco)
				values (?, 1, 'Bolo', 'Cenoura', 90.00)
				""", outraLoja);

		mockMvc.perform(get("/api/cardapio/doces-da-ana"))
			.andExpect(jsonPath("$.estabelecimento.nome").value("Doces da Ana"))
			.andExpect(jsonPath("$.produtos[*].sabor", contains("Cenoura")));
		mockMvc.perform(get(CASA_BELT)).andExpect(jsonPath("$.produtos.length()").value(4));
	}

	@Test
	void linkInexistenteOuDeLojaDesativadaDa404() throws Exception {
		mockMvc.perform(get("/api/cardapio/nao-existe"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.codigo").value("ESTABELECIMENTO_NAO_ENCONTRADO"));

		jdbc.update("update estabelecimento set ativo = false where id = ?", casaBelt);
		mockMvc.perform(get(CASA_BELT))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.codigo").value("ESTABELECIMENTO_NAO_ENCONTRADO"));
	}

	@Test
	void soALeituraDoCardapioFicaAbertaSemLogin() throws Exception {
		mockMvc.perform(post(CASA_BELT)).andExpect(status().isUnauthorized());
		mockMvc.perform(put(CASA_BELT)).andExpect(status().isUnauthorized());
		mockMvc.perform(get(CASA_BELT + "/produtos")).andExpect(status().isUnauthorized());
		mockMvc.perform(get("/api/pedidos")).andExpect(status().isUnauthorized());
		mockMvc.perform(get("/api/produtos")).andExpect(status().isUnauthorized());
	}

}
