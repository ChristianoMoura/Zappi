package br.com.zappi.produto;

import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.Map;

import br.com.zappi.erro.DadosInvalidosException;

/**
 * Lista fixa de alérgenos do produto (ZAP-128, ZAP-197): os mais comuns em padaria e
 * confeitaria, na mesma ordem da tela ({@code ALERGENOS} em
 * {@code frontend/src/produtos/regrasProdutos.js}). O banco só aceita estes códigos
 * ({@code ck_produto_alergenos}, V12). Os que não estão aqui vão no texto livre
 * {@code outrosAlergenos}.
 */
public enum Alergeno {

	GLUTEN, LEITE, OVOS, SOJA, AMENDOIM, CASTANHAS, GERGELIM;

	static final String FORA_DA_LISTA = "Escolha os alérgenos da lista.";

	/**
	 * Os códigos recebidos, sem repetir e na ordem da lista. Sem lista é o mesmo que nenhum
	 * alérgeno; um código fora da lista (ou vazio) recusa o produto inteiro com 400.
	 */
	static List<String> dosCodigos(Collection<String> codigos) {
		if (codigos == null) {
			return List.of();
		}
		List<String> conhecidos = Arrays.stream(values()).map(Enum::name).toList();
		if (codigos.stream().anyMatch(codigo -> codigo == null || !conhecidos.contains(codigo))) {
			throw new DadosInvalidosException(Map.of("alergenos", FORA_DA_LISTA));
		}
		return conhecidos.stream().filter(codigos::contains).toList();
	}

}
