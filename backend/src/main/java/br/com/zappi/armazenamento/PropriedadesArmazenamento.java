package br.com.zappi.armazenamento;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Supabase Storage, onde ficam as fotos dos produtos ({@code zappi.armazenamento}).
 *
 * @param url endereço do projeto no Supabase ({@code SUPABASE_URL}), ex.:
 *        {@code https://<id-do-projeto>.supabase.co}
 * @param chaveSecreta chave secreta do projeto ({@code SUPABASE_CHAVE_SECRETA}), usada só pelo
 *        backend para enviar e apagar fotos (ISO 27002 8.24)
 * @param bucket bucket das fotos, com leitura pública
 * @param obrigatorio {@code true} no perfil prod: sem a configuração, o backend não sobe
 */
@ConfigurationProperties(prefix = "zappi.armazenamento")
public record PropriedadesArmazenamento(String url, String chaveSecreta, String bucket, boolean obrigatorio) {

	public PropriedadesArmazenamento {
		url = url == null || url.isBlank() ? null : url.trim().replaceAll("/+$", "");
		chaveSecreta = chaveSecreta == null || chaveSecreta.isBlank() ? null : chaveSecreta.trim();
		bucket = bucket == null || bucket.isBlank() ? "produtos" : bucket.trim();
	}

	boolean configurado() {
		return url != null && chaveSecreta != null;
	}

}
