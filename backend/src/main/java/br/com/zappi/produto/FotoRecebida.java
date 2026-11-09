package br.com.zappi.produto;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Arrays;
import java.util.Objects;

import org.springframework.web.multipart.MultipartFile;

/**
 * Foto enviada pela tela, já validada (ZAP-40, RN15): JPG, PNG ou WebP, até 5 MB, com
 * texto alternativo de até 150 caracteres.
 */
public record FotoRecebida(byte[] conteudo, TipoDeImagem tipo, String textoAlternativo) {

	public static final long TAMANHO_MAXIMO = 5L * 1024 * 1024;

	static final int TAMANHO_MAXIMO_TEXTO_ALTERNATIVO = 150;

	static FotoRecebida validar(MultipartFile arquivo, String textoAlternativo) {
		String texto = textoAlternativo == null ? "" : textoAlternativo.trim();
		if (texto.isEmpty()) {
			throw new FotoInvalidaException("textoAlternativo", "Descreva a foto para quem não consegue vê-la.");
		}
		if (texto.length() > TAMANHO_MAXIMO_TEXTO_ALTERNATIVO) {
			throw new FotoInvalidaException("textoAlternativo", "Use até 150 caracteres.");
		}
		if (arquivo == null || arquivo.isEmpty()) {
			throw new FotoInvalidaException("arquivo", "Escolha a foto do produto.");
		}
		if (arquivo.getSize() > TAMANHO_MAXIMO) {
			throw new FotoInvalidaException("arquivo", "A foto pode ter até 5 MB.");
		}
		byte[] conteudo = ler(arquivo);
		TipoDeImagem tipo = TipoDeImagem.detectar(conteudo)
			.orElseThrow(() -> new FotoInvalidaException("arquivo", "Envie a foto em JPG, PNG ou WebP."));
		return new FotoRecebida(conteudo, tipo, texto);
	}

	// Records com array comparam o array pela referência; aqui compara pelo conteúdo.
	@Override
	public boolean equals(Object outro) {
		return outro instanceof FotoRecebida foto && Arrays.equals(conteudo, foto.conteudo) && tipo == foto.tipo
				&& Objects.equals(textoAlternativo, foto.textoAlternativo);
	}

	@Override
	public int hashCode() {
		return Objects.hash(Arrays.hashCode(conteudo), tipo, textoAlternativo);
	}

	@Override
	public String toString() {
		return "FotoRecebida[" + tipo + ", " + conteudo.length + " bytes]";
	}

	private static byte[] ler(MultipartFile arquivo) {
		try {
			return arquivo.getBytes();
		}
		catch (IOException erro) {
			throw new UncheckedIOException(erro);
		}
	}

}
