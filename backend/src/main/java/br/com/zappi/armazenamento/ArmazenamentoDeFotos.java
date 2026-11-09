package br.com.zappi.armazenamento;

/**
 * Onde as fotos dos produtos ficam guardadas (Supabase Storage, ZAP-40). O banco guarda
 * só o caminho dentro do bucket; o envio é feito só pelo backend, e a leitura é pública.
 */
public interface ArmazenamentoDeFotos {

	/** {@code false} quando o Storage não está configurado (ex.: localmente). */
	boolean disponivel();

	/**
	 * Envia o arquivo para o caminho informado, ex.: {@code 1/7-a1b2c3d4.jpg}.
	 *
	 * @throws ArmazenamentoIndisponivelException se o Storage não estiver configurado ou falhar
	 */
	void enviar(String caminho, byte[] conteudo, String tipo);

	/** Apaga o arquivo. Usado depois de trocar ou remover a foto. */
	void apagar(String caminho);

	/** Endereço público da foto, ou nulo sem caminho ou sem o Storage configurado. */
	String enderecoPublico(String caminho);

}
