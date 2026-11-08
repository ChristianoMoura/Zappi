package br.com.zappi;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seed da V2 (ZAP-73, seção 5.3 do context.md). A senha da Lídia não aparece no
 * código: o teste só confere que ela está guardada como hash BCrypt. O login de
 * verdade é testado na ZAP-31.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class DadosIniciaisTests {

	@Autowired
	private JdbcTemplate jdbc;

	@Test
	void criaACasaBeltComALidia() {
		Map<String, Object> lidia = jdbc.queryForMap("""
				select u.nome, u.email, u.senha_hash, u.ativo, e.nome as estabelecimento
				from usuario u join estabelecimento e on e.id = u.estabelecimento_id
				where e.slug = 'casa-belt'
				""");

		assertThat(lidia).containsEntry("estabelecimento", "Casa Belt")
			.containsEntry("nome", "Lídia")
			.containsEntry("email", "lidia@casabelt.com")
			.containsEntry("ativo", true);
		// Hash BCrypt com custo 12 (ISO 27002 8.24), nunca a senha em texto.
		assertThat((String) lidia.get("senha_hash")).matches("^\\$2a\\$12\\$.{53}$");
	}

	@Test
	void criaOCardapioDeExemplo() {
		List<String> produtos = jdbc.queryForList("""
				select p.sabor from produto p join estabelecimento e on e.id = p.estabelecimento_id
				where e.slug = 'casa-belt' and p.ativo order by p.id
				""", String.class);

		assertThat(produtos).containsExactly("Brigadeiro de chocolate", "Ninho com morango", "Cento de coxinha",
				"Coxinha por unidade");
	}

	@Test
	void criaDoisPedidosNovosComOTotalIgualASomaDosItens() {
		List<Map<String, Object>> pedidos = jdbc.queryForList("""
				select pe.numero, pe.status, pe.valor_total, sum(i.subtotal) as soma_itens,
				       bool_and(i.subtotal = round(i.quantidade * i.preco_unitario, 2)) as subtotais_certos
				from pedido pe
				join estabelecimento e on e.id = pe.estabelecimento_id
				join item_pedido i on i.pedido_id = pe.id
				where e.slug = 'casa-belt'
				group by pe.id order by pe.numero
				""");

		assertThat(pedidos).extracting(pedido -> pedido.get("numero")).containsExactly(1, 2);
		assertThat(pedidos).allSatisfy(pedido -> {
			assertThat(((Number) pedido.get("status")).intValue()).isEqualTo(1);
			assertThat((BigDecimal) pedido.get("valor_total")).isEqualByComparingTo((BigDecimal) pedido.get("soma_itens"));
			assertThat(pedido.get("subtotais_certos")).isEqualTo(true);
		});
	}

	@Test
	void criaClientesFicticiosComConsentimento() {
		List<Map<String, Object>> clientes = jdbc.queryForList("""
				select c.nome, c.consentimento_lgpd, c.consentimento_em
				from cliente c join estabelecimento e on e.id = c.estabelecimento_id
				where e.slug = 'casa-belt' order by c.id
				""");

		assertThat(clientes).extracting(cliente -> cliente.get("nome")).containsExactly("Ana Exemplo", "Bruno Exemplo");
		assertThat(clientes).allSatisfy(cliente -> {
			assertThat(cliente.get("consentimento_lgpd")).isEqualTo(true);
			assertThat(cliente.get("consentimento_em")).isNotNull();
		});
	}

}
