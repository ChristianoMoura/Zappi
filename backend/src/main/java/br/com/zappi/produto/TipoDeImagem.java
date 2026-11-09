package br.com.zappi.produto;

import java.util.Arrays;
import java.util.Optional;

/**
 * Formatos de foto aceitos (ZAP-40). O tipo é descoberto pelos primeiros bytes do arquivo,
 * não pela extensão nem pelo tipo informado pelo navegador, que podem ser trocados.
 */
public enum TipoDeImagem {

	JPEG("image/jpeg", "jpg"), PNG("image/png", "png"), WEBP("image/webp", "webp");

	private static final byte[] ASSINATURA_JPEG = { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF };

	private static final byte[] ASSINATURA_PNG = { (byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n' };

	private static final byte[] RIFF = { 'R', 'I', 'F', 'F' };

	private static final byte[] WEBP_MARCA = { 'W', 'E', 'B', 'P' };

	private final String mime;

	private final String extensao;

	TipoDeImagem(String mime, String extensao) {
		this.mime = mime;
		this.extensao = extensao;
	}

	public String mime() {
		return mime;
	}

	public String extensao() {
		return extensao;
	}

	static Optional<TipoDeImagem> detectar(byte[] conteudo) {
		if (comecaCom(conteudo, 0, ASSINATURA_JPEG)) {
			return Optional.of(JPEG);
		}
		if (comecaCom(conteudo, 0, ASSINATURA_PNG)) {
			return Optional.of(PNG);
		}
		if (comecaCom(conteudo, 0, RIFF) && comecaCom(conteudo, 8, WEBP_MARCA)) {
			return Optional.of(WEBP);
		}
		return Optional.empty();
	}

	private static boolean comecaCom(byte[] conteudo, int inicio, byte[] assinatura) {
		return conteudo.length >= inicio + assinatura.length
				&& Arrays.equals(conteudo, inicio, inicio + assinatura.length, assinatura, 0, assinatura.length);
	}

}
