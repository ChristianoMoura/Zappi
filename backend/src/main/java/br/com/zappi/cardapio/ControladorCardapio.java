package br.com.zappi.cardapio;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Portal do Cliente: rotas abertas, sem login (RN02). Só leitura de dados públicos da loja
 * (ISO 27002 5.15, 5.34).
 */
@RestController
@RequestMapping(ControladorCardapio.ROTA)
public class ControladorCardapio {

	/** Prefixo das rotas públicas do Portal do Cliente, liberado na configuração de segurança. */
	public static final String ROTA = "/api/cardapio";

	private final ServicoCardapio servico;

	public ControladorCardapio(ServicoCardapio servico) {
		this.servico = servico;
	}

	/**
	 * Cardápio pelo link da loja, ex.: {@code /api/cardapio/casa-belt} (ZAP-104): dados públicos
	 * da loja e os produtos ativos.
	 */
	@GetMapping("/{slug}")
	public RespostaCardapio buscar(@PathVariable String slug) {
		return servico.buscar(slug);
	}

}
