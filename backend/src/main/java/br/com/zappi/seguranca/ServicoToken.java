package br.com.zappi.seguranca;

import java.time.Instant;

import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

/**
 * Gera o token JWT entregue no login (ZAP-31). O token leva só o id do usuário
 * ({@code sub}) e o do estabelecimento, sem dados pessoais, e vale 8 horas, sem refresh
 * token (decisão da ZAP-62).
 */
@Service
public class ServicoToken {

	private final JwtEncoder codificador;

	private final PropriedadesJwt propriedades;

	public ServicoToken(JwtEncoder codificador, PropriedadesJwt propriedades) {
		this.codificador = codificador;
		this.propriedades = propriedades;
	}

	public String gerar(UsuarioAutenticado usuario) {
		Instant agora = Instant.now();
		JwtClaimsSet claims = JwtClaimsSet.builder()
			.issuer(ConfiguracaoJwt.EMISSOR)
			.subject(usuario.usuarioId().toString())
			.claim(ConfiguracaoJwt.CLAIM_ESTABELECIMENTO, usuario.estabelecimentoId())
			.issuedAt(agora)
			.expiresAt(agora.plus(propriedades.validade()))
			.build();
		JwsHeader cabecalho = JwsHeader.with(ConfiguracaoJwt.ALGORITMO).build();
		return codificador.encode(JwtEncoderParameters.from(cabecalho, claims)).getTokenValue();
	}

}
