package br.com.zappi.estabelecimento;

import java.time.OffsetDateTime;
import java.util.Arrays;

/**
 * As duas fotos da loja que ficam no Storage (ZAP-119). O nome é o da rota
 * ({@code /api/estabelecimento/logo} e {@code /api/estabelecimento/capa}), o do campo na
 * resposta e o começo do nome do arquivo no bucket.
 */
public enum FotoDoEstabelecimento {

	LOGO("logo", "Escolha a foto do logo.") {
		@Override
		String caminho(Estabelecimento estabelecimento) {
			return estabelecimento.getLogoCaminho();
		}

		@Override
		void trocar(Estabelecimento estabelecimento, String caminho, OffsetDateTime agora) {
			estabelecimento.trocarLogo(caminho, agora);
		}
	},

	CAPA("capa", "Escolha a foto de capa.") {
		@Override
		String caminho(Estabelecimento estabelecimento) {
			return estabelecimento.getCapaCaminho();
		}

		@Override
		void trocar(Estabelecimento estabelecimento, String caminho, OffsetDateTime agora) {
			estabelecimento.trocarCapa(caminho, agora);
		}
	};

	/** Valores aceitos no caminho da rota. */
	static final String ROTAS = "logo|capa";

	private final String nome;

	private final String semArquivo;

	FotoDoEstabelecimento(String nome, String semArquivo) {
		this.nome = nome;
		this.semArquivo = semArquivo;
	}

	String nome() {
		return nome;
	}

	/** Mensagem quando o envio chega sem arquivo. */
	String semArquivo() {
		return semArquivo;
	}

	abstract String caminho(Estabelecimento estabelecimento);

	abstract void trocar(Estabelecimento estabelecimento, String caminho, OffsetDateTime agora);

	static FotoDoEstabelecimento daRota(String rota) {
		return Arrays.stream(values()).filter((foto) -> foto.nome.equals(rota)).findFirst().orElseThrow();
	}

}
