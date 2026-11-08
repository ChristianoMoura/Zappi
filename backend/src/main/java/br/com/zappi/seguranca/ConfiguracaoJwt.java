package br.com.zappi.seguranca;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.authentication.preauth.PreAuthenticatedAuthenticationToken;

import com.nimbusds.jose.jwk.source.ImmutableSecret;

/**
 * Assinatura e validação do token JWT com HMAC-SHA256 (ISO 27002 8.24). A chave vem
 * da variável de ambiente {@code JWT_CHAVE}, nunca do código.
 */
@Configuration
@EnableConfigurationProperties(PropriedadesJwt.class)
public class ConfiguracaoJwt {

	static final MacAlgorithm ALGORITMO = MacAlgorithm.HS256;

	static final String EMISSOR = "zappi";

	static final String CLAIM_ESTABELECIMENTO = "estabelecimento_id";

	private static final int TAMANHO_MINIMO_DA_CHAVE = 32;

	private static final Logger log = LoggerFactory.getLogger(ConfiguracaoJwt.class);

	@Bean
	SecretKey chaveDoJwt(PropriedadesJwt propriedades) {
		String chave = propriedades.chave() == null ? "" : propriedades.chave().trim();
		if (chave.isEmpty()) {
			if (propriedades.chaveObrigatoria()) {
				throw new IllegalStateException("Defina a variável de ambiente JWT_CHAVE (README, \"Acesso à API\").");
			}
			// Só fora da produção.
			log.warn("JWT_CHAVE vazia: usando uma chave aleatória. Os tokens deixam de valer quando o backend reiniciar.");
			byte[] aleatoria = new byte[TAMANHO_MINIMO_DA_CHAVE];
			new SecureRandom().nextBytes(aleatoria);
			return new SecretKeySpec(aleatoria, "HmacSHA256");
		}

		byte[] bytes;
		try {
			bytes = Base64.getDecoder().decode(chave);
		}
		catch (IllegalArgumentException erro) {
			throw new IllegalStateException("JWT_CHAVE precisa estar em Base64.", erro);
		}
		if (bytes.length < TAMANHO_MINIMO_DA_CHAVE) {
			throw new IllegalStateException(
					"JWT_CHAVE precisa ter pelo menos " + TAMANHO_MINIMO_DA_CHAVE + " bytes em Base64.");
		}
		return new SecretKeySpec(bytes, "HmacSHA256");
	}

	@Bean
	JwtEncoder codificadorDeJwt(SecretKey chaveDoJwt) {
		return new NimbusJwtEncoder(new ImmutableSecret<>(chaveDoJwt));
	}

	/**
	 * Aceita só tokens assinados com a nossa chave, dentro da validade, emitidos pelo
	 * Zappi e com o usuário e o estabelecimento preenchidos.
	 */
	@Bean
	JwtDecoder decodificadorDeJwt(SecretKey chaveDoJwt) {
		NimbusJwtDecoder decodificador = NimbusJwtDecoder.withSecretKey(chaveDoJwt).macAlgorithm(ALGORITMO).build();
		decodificador.setJwtValidator(new DelegatingOAuth2TokenValidator<Jwt>(
				JwtValidators.createDefaultWithIssuer(EMISSOR),
				new JwtClaimValidator<String>(JwtClaimNames.SUB, ConfiguracaoJwt::ehNumero),
				new JwtClaimValidator<Object>(CLAIM_ESTABELECIMENTO, Number.class::isInstance)));
		return decodificador;
	}

	/**
	 * Transforma o token já validado na autenticação da requisição, com o
	 * {@link UsuarioAutenticado} como principal. O decodificador já garantiu que o
	 * {@code sub} e o estabelecimento existem e são números.
	 */
	static AbstractAuthenticationToken autenticacao(Jwt token) {
		UsuarioAutenticado usuario = new UsuarioAutenticado(Long.valueOf(token.getSubject()),
				((Number) token.getClaim(CLAIM_ESTABELECIMENTO)).longValue());
		return new PreAuthenticatedAuthenticationToken(usuario, token, List.of());
	}

	private static boolean ehNumero(String valor) {
		return valor != null && valor.matches("\\d{1,18}");
	}

}
