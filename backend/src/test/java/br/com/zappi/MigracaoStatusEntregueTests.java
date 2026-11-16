package br.com.zappi;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Migração do status Entregue (V11, ZAP-167, ZAP-60) sobre um banco com pedidos em todos os
 * status antigos. Num schema separado, as migrações rodam até a V10, os pedidos são gravados e a
 * V11 roda por cima. O schema é apagado no fim.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class MigracaoStatusEntregueTests {

	private static final String SCHEMA = "teste_v11";

	@Autowired
	private Flyway flyway;

	@Autowired
	private JdbcTemplate jdbc;

	private long loja;

	private long cliente;

	private long concluido;

	@BeforeEach
	void migraAteAV10EGravaOsPedidosAntigos() {
		apagarSchema();
		migrar("10");

		loja = id("insert into %s.estabelecimento (nome, slug, telefone_whatsapp) values ('Loja A', 'loja-a', "
				+ "'5511900000001') returning id");
		cliente = id("""
				insert into %s.cliente (estabelecimento_id, nome, telefone_whatsapp, consentimento_lgpd, consentimento_em)
				values (?, 'Cliente de teste', '5511900000002', true, now()) returning id
				""", loja);
		// Um pedido em cada status de antes da V11: 1-Novo a 5-Recusado
		for (int status = 1; status <= 5; status++) {
			long pedido = pedido(status, status, status == 5 ? "Sem horário" : null);
			if (status == 4) {
				concluido = pedido;
			}
		}

		migrar("latest");
	}

	@AfterEach
	void apagarSchema() {
		jdbc.execute("drop schema if exists " + SCHEMA + " cascade");
	}

	@Test
	void naoMexeNosPedidosQueJaExistiam() {
		// Os pedidos de exemplo da V2 também ficam sem a data de entrega
		assertThat(jdbc.queryForList(sql("select status from %s.pedido where estabelecimento_id = ? order by numero"),
				Integer.class, loja))
			.containsExactly(1, 2, 3, 4, 5);
		assertThat(jdbc.queryForObject(sql("select count(*) from %s.pedido where entregue_em is not null"),
				Integer.class))
			.isZero();
	}

	@Test
	void marcaOConcluidoComoEntregueComAData() {
		jdbc.update(sql("update %s.pedido set status = 6, entregue_em = now() where id = ?"), concluido);

		Map<String, Object> pedido = jdbc
			.queryForMap(sql("select status, entregue_em from %s.pedido where id = ?"), concluido);
		assertThat(((Number) pedido.get("status")).intValue()).isEqualTo(6);
		assertThat(pedido.get("entregue_em")).isNotNull();
	}

	@Test
	void voltaParaConcluidoApagandoAData() {
		jdbc.update(sql("update %s.pedido set status = 6, entregue_em = now() where id = ?"), concluido);

		jdbc.update(sql("update %s.pedido set status = 4, entregue_em = null where id = ?"), concluido);

		assertThat(jdbc.queryForObject(sql("select entregue_em from %s.pedido where id = ?"), Object.class, concluido))
			.isNull();
	}

	@Test
	void recusaEntregueSemAData() {
		assertThatThrownBy(() -> jdbc.update(sql("update %s.pedido set status = 6 where id = ?"), concluido))
			.isInstanceOf(DataIntegrityViolationException.class)
			.hasMessageContaining("ck_pedido_entregue_em");
	}

	@Test
	void recusaDataDeEntregaForaDoEntregue() {
		assertThatThrownBy(
				() -> jdbc.update(sql("update %s.pedido set entregue_em = now() where id = ?"), concluido))
			.isInstanceOf(DataIntegrityViolationException.class)
			.hasMessageContaining("ck_pedido_entregue_em");
	}

	@Test
	void recusaStatusDepoisDoEntregue() {
		assertThatThrownBy(() -> pedido(6, 7, null)).isInstanceOf(DataIntegrityViolationException.class)
			.hasMessageContaining("ck_pedido_status");
	}

	@Test
	void criaAColunaOpcional() {
		Map<String, Object> coluna = jdbc.queryForMap("""
				select data_type, is_nullable from information_schema.columns
				where table_schema = ? and table_name = 'pedido' and column_name = 'entregue_em'
				""", SCHEMA);

		assertThat(coluna).containsEntry("data_type", "timestamp with time zone").containsEntry("is_nullable", "YES");
	}

	private long pedido(int numero, int status, String motivo) {
		return id("""
				insert into %s.pedido (estabelecimento_id, cliente_id, numero, status, data_retirada, motivo_recusa,
				                       valor_total)
				values (?, ?, ?, ?, current_date + 7 + time '12:00', ?, 100.00) returning id
				""", loja, cliente, numero, status, motivo);
	}

	private void migrar(String versao) {
		Flyway.configure()
			.configuration(flyway.getConfiguration())
			.schemas(SCHEMA)
			.defaultSchema(SCHEMA)
			.createSchemas(true)
			.target(versao)
			.load()
			.migrate();
	}

	private long id(String comando, Object... parametros) {
		return jdbc.queryForObject(sql(comando), Long.class, parametros);
	}

	private static String sql(String comando) {
		return comando.formatted(SCHEMA);
	}

}
