package br.com.zappi.estabelecimento;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Arrays;

import org.springframework.web.multipart.MultipartFile;

import br.com.zappi.produto.FotoInvalidaException;
import br.com.zappi.produto.FotoRecebida;
import br.com.zappi.produto.TipoDeImagem;

/**
 * Logo ou capa enviado pela tela, já validado com as regras da foto do produto (ZAP-40,
 * ZAP-119): JPG, PNG ou WebP, até 5 MB, com o tipo descoberto pelo conteúdo. Não há texto
 * alternativo: o do logo vem do nome da loja, e a capa é decorativa.
 */
record ArquivoDeFoto(byte[] conteudo, TipoDeImagem tipo) {

	private static final String CAMPO = "arquivo";

	static ArquivoDeFoto validar(MultipartFile arquivo, FotoDoEstabelecimento foto) {
		if (arquivo == null || arquivo.isEmpty()) {
			throw new FotoInvalidaException(CAMPO, foto.semArquivo());
		}
		if (arquivo.getSize() > FotoRecebida.TAMANHO_MAXIMO) {
			throw new FotoInvalidaException(CAMPO, "A foto pode ter até 5 MB.");
		}
		byte[] conteudo = ler(arquivo);
		TipoDeImagem tipo = TipoDeImagem.detectar(conteudo)
			.orElseThrow(() -> new FotoInvalidaException(CAMPO, "Envie a foto em JPG, PNG ou WebP."));
		return new ArquivoDeFoto(conteudo, tipo);
	}

	// Records com array comparam o array pela referência; aqui compara pelo conteúdo.
	@Override
	public boolean equals(Object outro) {
		return outro instanceof ArquivoDeFoto foto && Arrays.equals(conteudo, foto.conteudo) && tipo == foto.tipo;
	}

	@Override
	public int hashCode() {
		return 31 * Arrays.hashCode(conteudo) + tipo.hashCode();
	}

	@Override
	public String toString() {
		return "ArquivoDeFoto[" + tipo + ", " + conteudo.length + " bytes]";
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
