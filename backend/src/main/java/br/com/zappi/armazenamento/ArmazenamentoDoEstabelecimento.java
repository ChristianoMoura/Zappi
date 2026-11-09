package br.com.zappi.armazenamento;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Storage do logo e da capa do estabelecimento (ZAP-119): o mesmo projeto do Supabase das
 * fotos dos produtos, num bucket próprio ({@code zappi.armazenamento.bucket-estabelecimento},
 * {@code estabelecimentos} por padrão), também com leitura pública.
 * <p>
 * É um tipo à parte, e não mais um {@link ArmazenamentoDeFotos}, para quem já recebe o
 * Storage dos produtos (ZAP-40) continuar recebendo só ele.
 */
@Component
public class ArmazenamentoDoEstabelecimento {

	private final ArmazenamentoDeFotos fotos;

	@Autowired
	public ArmazenamentoDoEstabelecimento(PropriedadesArmazenamento propriedades,
			@Value("${zappi.armazenamento.bucket-estabelecimento:estabelecimentos}") String bucket) {
		this(new ArmazenamentoSupabase(propriedades.comBucket(bucket)));
	}

	/** Para os testes, com um Storage simulado. */
	public ArmazenamentoDoEstabelecimento(ArmazenamentoDeFotos fotos) {
		this.fotos = fotos;
	}

	public boolean disponivel() {
		return fotos.disponivel();
	}

	public void enviar(String caminho, byte[] conteudo, String tipo) {
		fotos.enviar(caminho, conteudo, tipo);
	}

	public void apagar(String caminho) {
		fotos.apagar(caminho);
	}

	public String enderecoPublico(String caminho) {
		return fotos.enderecoPublico(caminho);
	}

}
