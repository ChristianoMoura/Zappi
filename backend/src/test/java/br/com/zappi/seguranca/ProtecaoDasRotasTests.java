package br.com.zappi.seguranca;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.function.Consumer;

import javax.crypto.spec.SecretKeySpec;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.nimbusds.jose.jwk.source.ImmutableSecret;

import br.com.zappi.TestcontainersConfiguration;

/**
 * Proteção das rotas /api com JWT (ZAP-32). A rota {@code /api/teste/quem-sou-eu} existe
 * só nos testes e devolve o usuário que o Spring Security montou a partir do token.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({ TestcontainersConfiguration.class, ProtecaoDasRotasTests.RotaDeTeste.class })
class ProtecaoDasRotasTests {

	private static final String ROTA_PROTEGIDA = "/api/teste/quem-sou-eu";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ServicoToken servicoToken;

	@Autowired
	private JwtEncoder codificador;

	@Autowired
	private JwtDecoder decodificador;

	@Test
	void recusaRequisicaoSemToken() throws Exception {
		mockMvc.perform(get(ROTA_PROTEGIDA))
			.andExpect(status().isUnauthorized())
			.andExpect(header().string(HttpHeaders.WWW_AUTHENTICATE, startsWith("Bearer")));
	}

	@Test
	void entregaOUsuarioEOEstabelecimentoDoToken() throws Exception {
		String token = servicoToken.gerar(new UsuarioAutenticado(7L, 3L));

		mockMvc.perform(get(ROTA_PROTEGIDA).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.usuarioId").value(7))
			.andExpect(jsonPath("$.estabelecimentoId").value(3));
	}

	@Test
	void geraTokenQueValeOitoHoras() {
		Jwt token = decodificador.decode(servicoToken.gerar(new UsuarioAutenticado(7L, 3L)));

		assertThat(Duration.between(token.getIssuedAt(), token.getExpiresAt())).isEqualTo(Duration.ofHours(8));
		assertThat(token.getClaims()).containsOnlyKeys("iss", "sub", "estabelecimento_id", "iat", "exp");
	}

	@Test
	void recusaTokenExpirado() throws Exception {
		Instant agora = Instant.now();
		String token = assinar(codificador, claims -> claims.issuedAt(agora.minus(Duration.ofHours(9)))
			.expiresAt(agora.minus(Duration.ofHours(1))));

		mockMvc.perform(get(ROTA_PROTEGIDA).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void recusaTokenAssinadoComOutraChave() throws Exception {
		byte[] outraChave = new byte[32];
		new SecureRandom().nextBytes(outraChave);
		JwtEncoder outroCodificador = new NimbusJwtEncoder(
				new ImmutableSecret<>(new SecretKeySpec(outraChave, "HmacSHA256")));

		mockMvc.perform(get(ROTA_PROTEGIDA).header(HttpHeaders.AUTHORIZATION,
				"Bearer " + assinar(outroCodificador, claims -> {
				})))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void recusaTokenDeOutroEmissor() throws Exception {
		String token = assinar(codificador, claims -> claims.issuer("outro-sistema"));

		mockMvc.perform(get(ROTA_PROTEGIDA).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void recusaTokenSemEstabelecimento() throws Exception {
		String token = assinar(codificador,
				claims -> claims.claims(todas -> todas.remove(ConfiguracaoJwt.CLAIM_ESTABELECIMENTO)));

		mockMvc.perform(get(ROTA_PROTEGIDA).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void recusaTokenMalformado() throws Exception {
		mockMvc.perform(get(ROTA_PROTEGIDA).header(HttpHeaders.AUTHORIZATION, "Bearer nao-e-um-jwt"))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void deixaALoginAbertaSemToken() throws Exception {
		// Sem token, a rota de login chega ao controller: o corpo vazio dá 400, e não 401.
		mockMvc.perform(post(ConfiguracaoSeguranca.ROTA_LOGIN)).andExpect(status().isBadRequest());
	}

	/** Token válido para o usuário 7 do estabelecimento 3, com o ajuste do teste. */
	private static String assinar(JwtEncoder codificador, Consumer<JwtClaimsSet.Builder> ajuste) {
		Instant agora = Instant.now();
		JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
			.issuer(ConfiguracaoJwt.EMISSOR)
			.subject("7")
			.claim(ConfiguracaoJwt.CLAIM_ESTABELECIMENTO, 3L)
			.issuedAt(agora)
			.expiresAt(agora.plus(Duration.ofHours(8)));
		ajuste.accept(claims);
		return codificador
			.encode(JwtEncoderParameters.from(JwsHeader.with(ConfiguracaoJwt.ALGORITMO).build(), claims.build()))
			.getTokenValue();
	}

	@RestController
	static class RotaDeTeste {

		@GetMapping(ROTA_PROTEGIDA)
		UsuarioAutenticado quemSouEu(@AuthenticationPrincipal UsuarioAutenticado usuario) {
			return usuario;
		}

	}

}
