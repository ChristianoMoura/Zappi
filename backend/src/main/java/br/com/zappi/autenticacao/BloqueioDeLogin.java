package br.com.zappi.autenticacao;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Bloqueio temporário do login (RF02, ZAP-85): 5 falhas para o mesmo e-mail nos
 * últimos 15 minutos, desde o último login certo, bloqueiam novas tentativas até a mais
 * antiga dessas 5 completar 15 minutos.
 *
 * A contagem usa os {@code LOGIN_FALHA} do {@code log_auditoria} (ZAP-33), sem mudar o
 * banco. As tentativas recusadas pelo próprio bloqueio também vão para o log, mas não
 * entram na contagem: senão, alguém insistindo prolongaria o bloqueio para sempre.
 */
@Component
public class BloqueioDeLogin {

	static final int MAXIMO_DE_FALHAS = 5;

	static final Duration DURACAO = Duration.ofMinutes(15);

	private final JdbcTemplate jdbc;

	public BloqueioDeLogin(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	/**
	 * Até quando o e-mail (já normalizado) está bloqueado, ou vazio se ele pode tentar.
	 */
	public Optional<OffsetDateTime> bloqueadoAte(String email, OffsetDateTime agora) {
		List<OffsetDateTime> falhas = jdbc.queryForList("""
				select criado_em from log_auditoria
				where email_informado = ?
				  and acao = 'LOGIN_FALHA'
				  and coalesce(detalhes ->> 'motivo', '') <> ?
				  and criado_em > ?
				  and criado_em > coalesce(
				      (select max(criado_em) from log_auditoria
				       where email_informado = ? and acao = 'LOGIN_SUCESSO'),
				      '-infinity'::timestamptz)
				order by criado_em desc
				limit ?
				""", OffsetDateTime.class, email, ServicoAutenticacao.MotivoFalha.LOGIN_BLOQUEADO.name(),
				agora.minus(DURACAO), email, MAXIMO_DE_FALHAS);

		if (falhas.size() < MAXIMO_DE_FALHAS) {
			return Optional.empty();
		}
		// A lista vem da mais nova para a mais antiga: quando a 5ª sair da janela, libera.
		return Optional.of(falhas.get(MAXIMO_DE_FALHAS - 1).plus(DURACAO));
	}

}
