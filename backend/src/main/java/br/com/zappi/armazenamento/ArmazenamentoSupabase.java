package br.com.zappi.armazenamento;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Cliente da API do Supabase Storage. Envia e apaga com a chave secreta, que só existe
 * no backend (variável {@code SUPABASE_CHAVE_SECRETA}, nunca no código).
 */
@Component
@EnableConfigurationProperties(PropriedadesArmazenamento.class)
public class ArmazenamentoSupabase implements ArmazenamentoDeFotos {

	private static final Logger log = LoggerFactory.getLogger(ArmazenamentoSupabase.class);

	/** Os nomes são únicos a cada envio, então o navegador pode guardar a foto por 1 ano. */
	private static final String CACHE_DE_UM_ANO = "max-age=31536000";

	private final PropriedadesArmazenamento propriedades;

	private final RestClient cliente;

	@Autowired
	public ArmazenamentoSupabase(PropriedadesArmazenamento propriedades) {
		this(propriedades, RestClient.builder());
	}

	ArmazenamentoSupabase(PropriedadesArmazenamento propriedades, RestClient.Builder construtor) {
		if (!propriedades.configurado()) {
			if (propriedades.obrigatorio()) {
				throw new IllegalStateException(
						"Defina as variáveis de ambiente SUPABASE_URL e SUPABASE_CHAVE_SECRETA (README, \"Fotos dos produtos\").");
			}
			log.warn("SUPABASE_URL ou SUPABASE_CHAVE_SECRETA vazia: o envio de fotos fica indisponível.");
		}
		this.propriedades = propriedades;
		this.cliente = propriedades.configurado()
				? construtor.baseUrl(propriedades.url() + "/storage/v1")
					.defaultHeader("apikey", propriedades.chaveSecreta())
					.defaultHeader("Authorization", "Bearer " + propriedades.chaveSecreta())
					.build()
				: null;
	}

	@Override
	public boolean disponivel() {
		return cliente != null;
	}

	@Override
	public void enviar(String caminho, byte[] conteudo, String tipo) {
		if (cliente == null) {
			throw new ArmazenamentoIndisponivelException("Storage não configurado", null);
		}
		try {
			cliente.post()
				.uri(caminhoNaApi(caminho))
				.contentType(MediaType.parseMediaType(tipo))
				.header("cache-control", CACHE_DE_UM_ANO)
				.body(conteudo)
				.retrieve()
				.toBodilessEntity();
		}
		catch (RestClientException erro) {
			throw new ArmazenamentoIndisponivelException("Falha ao enviar a foto para o Storage", erro);
		}
	}

	@Override
	public void apagar(String caminho) {
		if (cliente == null || caminho == null) {
			return;
		}
		try {
			cliente.delete()
				.uri(caminhoNaApi(caminho))
				.retrieve()
				.toBodilessEntity();
		}
		catch (RestClientException erro) {
			// A foto antiga só ocupa espaço: o produto já aponta para a nova.
			log.warn("Não foi possível apagar a foto antiga {} do Storage", caminho, erro);
		}
	}

	/**
	 * Monta o caminho sem modelo de URI, que codificaria as barras do caminho ({@code 1/7-x.jpg}).
	 * O caminho é gerado pelo backend e só tem letras, números, hífen, ponto e barra.
	 */
	private String caminhoNaApi(String caminho) {
		return "/object/" + propriedades.bucket() + "/" + caminho;
	}

	@Override
	public String enderecoPublico(String caminho) {
		if (caminho == null || propriedades.url() == null) {
			return null;
		}
		return propriedades.url() + "/storage/v1/object/public/" + propriedades.bucket() + "/" + caminho;
	}

}
