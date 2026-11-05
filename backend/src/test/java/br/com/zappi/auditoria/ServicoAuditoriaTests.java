package br.com.zappi.auditoria;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import br.com.zappi.TestcontainersConfiguration;

// Enquanto as migrações da ZAP-72 não existem, a tabela é criada a partir do mapeamento só neste teste.
@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
@Import(TestcontainersConfiguration.class)
class ServicoAuditoriaTests {

	@Autowired
	private ServicoAuditoria servico;

	@Autowired
	private LogAuditoriaRepositorio repositorio;

	@Autowired
	private TransactionTemplate transacao;

	@Autowired
	private JdbcTemplate jdbc;

	@BeforeEach
	void limparLogs() {
		repositorio.deleteAll();
	}

	@AfterEach
	void encerrarRequisicao() {
		RequestContextHolder.resetRequestAttributes();
	}

	@Test
	void gravaAcaoComIpUserAgentEDetalhesEmJsonb() {
		simularRequisicao("203.0.113.10", "Mozilla/5.0 (Teste)");

		LogAuditoria log = servico.registrar(RegistroAuditoria.de(AcaoAuditoria.PRODUTO_EDITADO)
				.estabelecimento(1L)
				.usuario(2L)
				.entidade("produto", 10L)
				.detalhes(Map.of("antes", Map.of("preco", 100), "depois", Map.of("preco", 115))));

		LogAuditoria gravado = repositorio.findById(log.getId()).orElseThrow();
		assertThat(gravado.getAcao()).isEqualTo(AcaoAuditoria.PRODUTO_EDITADO);
		assertThat(gravado.getEstabelecimentoId()).isEqualTo(1L);
		assertThat(gravado.getUsuarioId()).isEqualTo(2L);
		assertThat(gravado.getEntidade()).isEqualTo("produto");
		assertThat(gravado.getEntidadeId()).isEqualTo(10L);
		assertThat(gravado.getIpOrigem()).isEqualTo("203.0.113.10");
		assertThat(gravado.getUserAgent()).isEqualTo("Mozilla/5.0 (Teste)");
		assertThat(gravado.getCriadoEm()).isNotNull();

		assertThat(jdbc.queryForObject("select acao from log_auditoria where id = ?", String.class, log.getId()))
			.isEqualTo("PRODUTO_EDITADO");
		assertThat(jdbc.queryForObject("select jsonb_typeof(detalhes) from log_auditoria where id = ?", String.class,
				log.getId()))
			.isEqualTo("object");
		assertThat(jdbc.queryForObject("select detalhes -> 'depois' ->> 'preco' from log_auditoria where id = ?",
				String.class, log.getId()))
			.isEqualTo("115");
	}

	@Test
	void desfazORegistroQuandoAOperacaoDeQuemChamouFalha() {
		assertThatThrownBy(() -> transacao.executeWithoutResult(status -> {
			servico.registrar(RegistroAuditoria.de(AcaoAuditoria.PEDIDO_CONFIRMADO).entidade("pedido", 1L));
			throw new IllegalStateException("falha ao gerar a mensagem");
		})).isInstanceOf(IllegalStateException.class);

		assertThat(repositorio.count()).isZero();
	}

	@Test
	void mantemORegistroEmTransacaoPropriaMesmoComFalha() {
		simularRequisicao("198.51.100.7", "Teste");

		assertThatThrownBy(() -> transacao.executeWithoutResult(status -> {
			servico.registrarEmTransacaoPropria(
					RegistroAuditoria.de(AcaoAuditoria.LOGIN_FALHA).emailInformado("nao.existe@exemplo.com"));
			throw new IllegalStateException("credenciais inválidas");
		})).isInstanceOf(IllegalStateException.class);

		assertThat(repositorio.findAll()).singleElement().satisfies(log -> {
			assertThat(log.getAcao()).isEqualTo(AcaoAuditoria.LOGIN_FALHA);
			assertThat(log.getEmailInformado()).isEqualTo("nao.existe@exemplo.com");
			assertThat(log.getEstabelecimentoId()).isNull();
			assertThat(log.getUsuarioId()).isNull();
			assertThat(log.getIpOrigem()).isEqualTo("198.51.100.7");
		});
	}

	@Test
	void foraDeUmaRequisicaoGravaSemIpEUserAgent() {
		// O @SpringBootTest abre uma requisição simulada em cada teste; aqui ela é removida.
		RequestContextHolder.resetRequestAttributes();

		LogAuditoria log = servico.registrar(RegistroAuditoria.de(AcaoAuditoria.PEDIDO_STATUS_ALTERADO));

		LogAuditoria gravado = repositorio.findById(log.getId()).orElseThrow();
		assertThat(gravado.getIpOrigem()).isNull();
		assertThat(gravado.getUserAgent()).isNull();
	}

	@Test
	void cortaTextosMaioresQueAColuna() {
		simularRequisicao("203.0.113.10", "a".repeat(300));

		LogAuditoria log = servico.registrar(
				RegistroAuditoria.de(AcaoAuditoria.LOGIN_FALHA).emailInformado("b".repeat(200) + "@exemplo.com"));

		LogAuditoria gravado = repositorio.findById(log.getId()).orElseThrow();
		assertThat(gravado.getUserAgent()).hasSize(255);
		assertThat(gravado.getEmailInformado()).hasSize(150);
	}

	private static void simularRequisicao(String ip, String userAgent) {
		MockHttpServletRequest requisicao = new MockHttpServletRequest();
		requisicao.setRemoteAddr(ip);
		requisicao.addHeader("User-Agent", userAgent);
		RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(requisicao));
	}

}
