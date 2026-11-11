package br.com.zappi;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/**
 * Restrições da seção 13.3 do context.md (ZAP-74): cada teste tenta gravar direto no
 * banco um dado inválido, sem passar pelas regras da aplicação, e confere qual
 * restrição recusou.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class RestricoesDoBancoTests {

	private static final String TELEFONE = "5511900000001";

	@Autowired
	private JdbcTemplate jdbc;

	@Test
	void recusaTelefoneDeClienteRepetidoNoMesmoEstabelecimento() {
		long confeitaria = criarEstabelecimento("confeitaria-a");
		criarCliente(confeitaria, TELEFONE);

		recusaPor("uk_cliente_telefone", () -> criarCliente(confeitaria, TELEFONE));
	}

	@Test
	void aceitaOMesmoTelefoneEmOutroEstabelecimento() {
		criarCliente(criarEstabelecimento("confeitaria-a"), TELEFONE);

		assertThat(criarCliente(criarEstabelecimento("confeitaria-b"), TELEFONE)).isPositive();
	}

	@Test
	void recusaNumeroDePedidoRepetidoNoMesmoEstabelecimento() {
		long confeitaria = criarEstabelecimento("confeitaria-a");
		long cliente = criarCliente(confeitaria, TELEFONE);
		criarPedido(confeitaria, cliente, 1, 1, null);

		recusaPor("uk_pedido_numero", () -> criarPedido(confeitaria, cliente, 1, 1, null));
	}

	@Test
	void aceitaOMesmoNumeroDePedidoEmOutroEstabelecimento() {
		long confeitariaA = criarEstabelecimento("confeitaria-a");
		long confeitariaB = criarEstabelecimento("confeitaria-b");
		criarPedido(confeitariaA, criarCliente(confeitariaA, TELEFONE), 1, 1, null);

		assertThat(criarPedido(confeitariaB, criarCliente(confeitariaB, TELEFONE), 1, 1, null)).isPositive();
	}

	@Test
	void recusaEmailDeUsuarioRepetido() {
		long confeitaria = criarEstabelecimento("confeitaria-a");
		criarUsuario(confeitaria, "repetido@exemplo.com");

		recusaPor("uk_usuario_email", () -> criarUsuario(confeitaria, "repetido@exemplo.com"));
	}

	@Test
	void recusaSlugRepetido() {
		criarEstabelecimento("confeitaria-a");

		recusaPor("uk_estabelecimento_slug", () -> criarEstabelecimento("confeitaria-a"));
	}

	@Test
	void recusaSiglaDeUnidadeRepetida() {
		recusaPor("uk_unidade_medida_sigla", () -> jdbc
			.update("insert into unidade_medida (id, sigla, descricao, permite_fracao) values (3, 'KG', 'Repetida', true)"));
	}

	@ParameterizedTest
	@ValueSource(strings = { "0", "-1.00" })
	void recusaPrecoDeProdutoMenorOuIgualAZero(String preco) {
		long confeitaria = criarEstabelecimento("confeitaria-a");

		recusaPor("ck_produto_preco", () -> criarProduto(confeitaria, preco, null, null));
	}

	@ParameterizedTest
	@ValueSource(strings = { "0", "-0.500" })
	void recusaQuantidadeDeItemMenorOuIgualAZero(String quantidade) {
		long confeitaria = criarEstabelecimento("confeitaria-a");
		long pedido = criarPedido(confeitaria, criarCliente(confeitaria, TELEFONE), 1, 1, null);
		long produto = criarProduto(confeitaria, "10.00", null, null);

		recusaPor("ck_item_pedido_quantidade", () -> criarItem(pedido, produto, quantidade));
	}

	@Test
	void recusaPedidoRecusadoSemMotivo() {
		long confeitaria = criarEstabelecimento("confeitaria-a");
		long cliente = criarCliente(confeitaria, TELEFONE);

		recusaPor("ck_pedido_motivo_recusa", () -> criarPedido(confeitaria, cliente, 1, 5, null));
	}

	@Test
	void aceitaPedidoRecusadoComMotivo() {
		long confeitaria = criarEstabelecimento("confeitaria-a");

		assertThat(criarPedido(confeitaria, criarCliente(confeitaria, TELEFONE), 1, 5, "Sem agenda")).isPositive();
	}

	@ParameterizedTest
	@ValueSource(strings = { "07:30", "20:30", "15:15", "15:00:30", "00:00" })
	void recusaRetiradaForaDoHorarioPermitido(String hora) {
		long pedido = pedidoDeExemplo();

		recusaPor("ck_pedido_horario_retirada", () -> jdbc.update(
				"update pedido set data_retirada = current_date + 7 + ?::time where id = ?", hora, pedido));
	}

	@ParameterizedTest
	@ValueSource(strings = { "08:00", "14:30", "20:00" })
	void aceitaRetiradaDas8hAs20hDeMeiaEmMeiaHora(String hora) {
		long pedido = pedidoDeExemplo();

		jdbc.update("update pedido set data_retirada = current_date + 7 + ?::time where id = ?", hora, pedido);
	}

	@ParameterizedTest
	@ValueSource(ints = { 0, 6 })
	void recusaStatusDePedidoForaDoIntervalo(int status) {
		long confeitaria = criarEstabelecimento("confeitaria-a");
		long cliente = criarCliente(confeitaria, TELEFONE);

		recusaPor("ck_pedido_status", () -> criarPedido(confeitaria, cliente, 1, status, "Motivo"));
	}

	@ParameterizedTest
	@ValueSource(ints = { 0, 4 })
	void recusaTipoDeMensagemForaDoIntervalo(int tipo) {
		long pedido = pedidoDeExemplo();

		recusaPor("ck_mensagem_whatsapp_tipo", () -> criarMensagem(pedido, tipo, 1));
	}

	@ParameterizedTest
	@ValueSource(ints = { 0, 4 })
	void recusaStatusDeMensagemForaDoIntervalo(int status) {
		long pedido = pedidoDeExemplo();

		recusaPor("ck_mensagem_whatsapp_status", () -> criarMensagem(pedido, 1, status));
	}

	@Test
	void recusaClienteSemConsentimento() {
		long confeitaria = criarEstabelecimento("confeitaria-a");

		recusaPor("ck_cliente_consentimento", () -> jdbc.update("""
				insert into cliente (estabelecimento_id, nome, telefone_whatsapp, consentimento_lgpd, consentimento_em)
				values (?, 'Cliente de teste', ?, false, now())
				""", confeitaria, TELEFONE));
	}

	@Test
	void recusaFotoSemTextoAlternativo() {
		long confeitaria = criarEstabelecimento("confeitaria-a");

		recusaPor("ck_produto_foto_texto_alternativo",
				() -> criarProduto(confeitaria, "10.00", "1/bolo.jpg", null));
	}

	@Test
	void aceitaProdutoSemFotoEComFotoDescrita() {
		long confeitaria = criarEstabelecimento("confeitaria-a");

		assertThat(criarProduto(confeitaria, "10.00", null, null)).isPositive();
		assertThat(criarProduto(confeitaria, "10.00", "1/bolo.jpg", "Bolo de brigadeiro")).isPositive();
	}

	@Test
	void apagarOPedidoApagaOsItensEAsMensagens() {
		long confeitaria = criarEstabelecimento("confeitaria-a");
		long pedido = criarPedido(confeitaria, criarCliente(confeitaria, TELEFONE), 1, 1, null);
		criarItem(pedido, criarProduto(confeitaria, "10.00", null, null), "1.000");
		criarMensagem(pedido, 1, 1);

		jdbc.update("delete from pedido where id = ?", pedido);

		assertThat(contar("item_pedido", pedido)).isZero();
		assertThat(contar("mensagem_whatsapp", pedido)).isZero();
	}

	private static void recusaPor(String restricao, org.assertj.core.api.ThrowableAssert.ThrowingCallable gravacao) {
		assertThatThrownBy(gravacao).isInstanceOf(DataIntegrityViolationException.class)
			.hasMessageContaining(restricao);
	}

	private long pedidoDeExemplo() {
		long confeitaria = criarEstabelecimento("confeitaria-a");
		return criarPedido(confeitaria, criarCliente(confeitaria, TELEFONE), 1, 1, null);
	}

	private long contar(String tabela, long pedido) {
		return jdbc.queryForObject("select count(*) from " + tabela + " where pedido_id = ?", Long.class, pedido);
	}

	private long criarEstabelecimento(String slug) {
		return jdbc.queryForObject("""
				insert into estabelecimento (nome, slug, telefone_whatsapp)
				values ('Confeitaria de teste', ?, '5511900000000') returning id
				""", Long.class, slug);
	}

	private void criarUsuario(long estabelecimento, String email) {
		jdbc.update("""
				insert into usuario (estabelecimento_id, nome, email, senha_hash)
				values (?, 'Usuária de teste', ?, 'hash-de-teste')
				""", estabelecimento, email);
	}

	private long criarCliente(long estabelecimento, String telefone) {
		return jdbc.queryForObject("""
				insert into cliente (estabelecimento_id, nome, telefone_whatsapp, consentimento_lgpd, consentimento_em)
				values (?, 'Cliente de teste', ?, true, now()) returning id
				""", Long.class, estabelecimento, telefone);
	}

	private long criarProduto(long estabelecimento, String preco, String foto, String textoAlternativo) {
		return jdbc.queryForObject("""
				insert into produto (estabelecimento_id, unidade_medida_id, nome, sabor, preco, foto_caminho,
				                     foto_texto_alternativo)
				values (?, 1, 'Bolo', 'Teste', ?, ?, ?) returning id
				""", Long.class, estabelecimento, new BigDecimal(preco), foto, textoAlternativo);
	}

	private long criarPedido(long estabelecimento, long cliente, int numero, int status, String motivo) {
		return jdbc.queryForObject("""
				insert into pedido (estabelecimento_id, cliente_id, numero, status, data_retirada, motivo_recusa,
				                    valor_total)
				values (?, ?, ?, ?, current_date + 7 + time '12:00', ?, 100.00) returning id
				""", Long.class, estabelecimento, cliente, numero, status, motivo);
	}

	private void criarItem(long pedido, long produto, String quantidade) {
		jdbc.update("""
				insert into item_pedido (pedido_id, produto_id, quantidade, preco_unitario, subtotal)
				values (?, ?, ?, 10.00, 10.00)
				""", pedido, produto, new BigDecimal(quantidade));
	}

	private void criarMensagem(long pedido, int tipo, int status) {
		jdbc.update("""
				insert into mensagem_whatsapp (pedido_id, tipo, telefone_destino, conteudo, status)
				values (?, ?, '5511900000001', 'Mensagem de teste', ?)
				""", pedido, tipo, status);
	}

}
