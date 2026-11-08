package br.com.zappi.autenticacao;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.zappi.seguranca.ServicoToken;
import br.com.zappi.seguranca.UsuarioAutenticado;
import br.com.zappi.usuario.Usuario;
import br.com.zappi.usuario.UsuarioRepositorio;

/**
 * Login da Lídia com e-mail e senha (RF01, RF02, ISO 27002 5.16 e 8.24).
 */
@Service
public class ServicoAutenticacao {

	private final UsuarioRepositorio usuarios;

	private final PasswordEncoder codificadorDeSenha;

	private final ServicoToken servicoToken;

	/**
	 * Hash de uma senha aleatória, conferido quando o e-mail não existe. Assim a resposta
	 * leva o mesmo tempo nos dois casos e não revela quais e-mails estão cadastrados.
	 */
	private final String hashFicticio;

	public ServicoAutenticacao(UsuarioRepositorio usuarios, PasswordEncoder codificadorDeSenha,
			ServicoToken servicoToken) {
		this.usuarios = usuarios;
		this.codificadorDeSenha = codificadorDeSenha;
		this.servicoToken = servicoToken;
		this.hashFicticio = codificadorDeSenha.encode(UUID.randomUUID().toString());
	}

	/**
	 * Confere e-mail e senha e devolve o token. Com qualquer problema nas credenciais,
	 * lança {@link CredenciaisInvalidasException}, sempre com a mesma mensagem.
	 */
	@Transactional
	public RespostaLogin entrar(String email, String senha) {
		Optional<Usuario> encontrado = usuarios.findByEmail(email.trim().toLowerCase(Locale.ROOT));
		boolean senhaConfere = senhaConfere(senha, encontrado.map(Usuario::getSenhaHash).orElse(hashFicticio));

		Usuario usuario = encontrado.filter(u -> senhaConfere && u.isAtivo())
			.orElseThrow(CredenciaisInvalidasException::new);

		usuario.registrarLogin(OffsetDateTime.now(ZoneOffset.UTC));
		String token = servicoToken.gerar(new UsuarioAutenticado(usuario.getId(), usuario.getEstabelecimento().getId()));
		return new RespostaLogin(token, usuario.getNome());
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
