package br.com.zappi.seguranca;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Origens do frontend que podem chamar a API ({@code zappi.cors.origens-permitidas}),
 * vindas da variável de ambiente {@code CORS_ORIGENS}.
 */
@ConfigurationProperties(prefix = "zappi.cors")
public record PropriedadesCors(List<String> origensPermitidas) {

	public PropriedadesCors {
		origensPermitidas = origensPermitidas == null ? List.of() : List.copyOf(origensPermitidas);
	}

}
