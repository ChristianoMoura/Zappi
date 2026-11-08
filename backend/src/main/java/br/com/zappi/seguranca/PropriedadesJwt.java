package br.com.zappi.seguranca;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuração do token JWT ({@code zappi.jwt}).
 *
 * @param chave chave HMAC em Base64, com 32 bytes ou mais, vinda da variável de ambiente
 *        {@code JWT_CHAVE}. Obrigatória em produção; vazia nos outros ambientes, quando o
 *        backend gera uma chave aleatória a cada subida.
 * @param validade quanto tempo o token vale depois do login (8 horas, decisão da ZAP-62)
 * @param chaveObrigatoria {@code true} no perfil prod: sem a chave, o backend não sobe
 */
@ConfigurationProperties(prefix = "zappi.jwt")
public record PropriedadesJwt(String chave, Duration validade, boolean chaveObrigatoria) {

	public PropriedadesJwt {
		validade = validade == null ? Duration.ofHours(8) : validade;
	}

}
