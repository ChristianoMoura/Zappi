package br.com.zappi.autenticacao;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.zappi.auditoria.AcaoAuditoria;
import br.com.zappi.auditoria.RegistroAuditoria;
import br.com.zappi.auditoria.ServicoAuditoria;
import br.com.zappi.seguranca.ServicoToken;
import br.com.zappi.seguranca.UsuarioAutenticado;
import br.com.zappi.usuario.Usuario;
import br.com.zappi.usuario.UsuarioRepositorio;

/**
 * Login da Lídia com e-mail e senha (RF01, RF02, ISO 27002 5.16 e 8.24). Toda tentativa
 * fica no log de auditoria (ZAP-33, ISO 27002 8.16).
 */
@Service
public class ServicoAutenticacao {

	/** Por que o login falhou. Fica só no log; a API responde sempre a mesma coisa. */
	enum MotivoFalha {
		EMAIL_INEXISTENTE, SENHA_INCORRETA, USUARIO_INATIVO,
		/** Recusada pelo bloqueio (ZAP-85), sem conferir a senha. Não conta para o bloqueio. */
		LOGIN_BLOQUEADO
	}

	private final UsuarioRepositorio usuarios;

	private final PasswordEncoder codificadorDeSenha;

	private final ServicoToken servicoToken;

	private final ServicoAuditoria auditoria;

	private final BloqueioDeLogin bloqueio;

	/**
	 * Hash de uma senha aleatória, conferido quando o e-mail não existe. Assim a resposta
	 * leva o mesmo tempo nos dois casos e não revela quais e-mails estão cadastrados.
	 */
	private final String hashFicticio;

	public ServicoAutenticacao(UsuarioRepositorio usuarios, PasswordEncoder codificadorDeSenha,
			ServicoToken servicoToken, ServicoAuditoria auditoria, BloqueioDeLogin bloqueio) {
		this.usuarios = usuarios;
		this.codificadorDeSenha = codificadorDeSenha;
		this.servicoToken = servicoToken;
		this.auditoria = auditoria;
		this.bloqueio = bloqueio;
		this.hashFicticio = codificadorDeSenha.encode(UUID.randomUUID().toString());
	}

	/**
	 * Confere e-mail e senha e devolve o token. Com qualquer problema nas credenciais,
	 * lança {@link CredenciaisInvalidasException}, sempre com a mesma mensagem. Com 5
	 * falhas seguidas, lança {@link LoginBloqueadoException} por 15 minutos.
	 */
	@Transactional
	public RespostaLogin entrar(String email, String senha) {
		String emailNormalizado = email.trim().toLowerCase(Locale.ROOT);
		Optional<Usuario> encontrado = usuarios.findByEmail(emailNormalizado);

		OffsetDateTime agora = OffsetDateTime.now(ZoneOffset.UTC);
		Optional<OffsetDateTime> bloqueadoAte = bloqueio.bloqueadoAte(emailNormalizado, agora);
		if (bloqueadoAte.isPresent()) {
			// Nem confere a senha: durante o bloqueio, nem a senha certa entra.
			falha(emailNormalizado, encontrado.orElse(null), MotivoFalha.LOGIN_BLOQUEADO);
			throw new LoginBloqueadoException(Duration.between(agora, bloqueadoAte.get()));
		}

		boolean senhaConfere = senhaConfere(senha, encontrado.map(Usuario::getSenhaHash).orElse(hashFicticio));

		if (encontrado.isEmpty()) {
			throw falha(emailNormalizado, null, MotivoFalha.EMAIL_INEXISTENTE);
		}
		Usuario usuario = encontrado.get();
		if (!senhaConfere) {
			throw falha(emailNormalizado, usuario, MotivoFalha.SENHA_INCORRETA);
		}
		if (!usuario.isAtivo()) {
			throw falha(emailNormalizado, usuario, MotivoFalha.USUARIO_INATIVO);
		}

		Long estabelecimentoId = usuario.getEstabelecimento().getId();
		usuario.registrarLogin(agora);
		// Na mesma transação: se algo falhar daqui em diante, o registro é desfeito junto.
		auditoria.registrar(RegistroAuditoria.de(AcaoAuditoria.LOGIN_SUCESSO)
			.estabelecimento(estabelecimentoId)
			.usuario(usuario.getId())
			.emailInformado(emailNormalizado));

		String token = servicoToken.gerar(new UsuarioAutenticado(usuario.getId(), estabelecimentoId));
		return new RespostaLogin(token, usuario.getNome());
	}

	/**
	 * Grava o {@code LOGIN_FALHA} numa transação própria, que fica salva mesmo com o erro
	 * que desfaz o login (a contagem do bloqueio usa esses registros, ZAP-85). Com e-mail
	 * inexistente, o usuário e o estabelecimento ficam nulos. A senha nunca vai para o log.
	 */
	private CredenciaisInvalidasException falha(String emailNormalizado, Usuario usuario, MotivoFalha motivo) {
		auditoria.registrarEmTransacaoPropria(RegistroAuditoria.de(AcaoAuditoria.LOGIN_FALHA)
			.estabelecimento(usuario == null ? null : usuario.getEstabelecimento().getId())
			.usuario(usuario == null ? null : usuario.getId())
			.emailInformado(emailNormalizado)
			.detalhes(Map.of("motivo", motivo.name())));
		return new CredenciaisInvalidasException();
	}

	private boolean senhaConfere(String senha, String hash) {
		try {
			return codificadorDeSenha.matches(senha, hash);
		}
		catch (IllegalArgumentException senhaLongaDemais) {
			// O BCrypt só aceita até 72 bytes: uma senha maior nunca é a certa.
			return false;
		}
	}

}
