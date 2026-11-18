package br.com.zappi.pagamento;

import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Formas de pagamento que a loja pode aceitar (ZAP-190), na ordem da tela
 * ({@code FORMAS_PAGAMENTO} em {@code frontend/src/comum/formasPagamento.js}). O pagamento é
 * sempre na retirada (RN19): o sistema só guarda a forma combinada. O banco só aceita estes
 * códigos ({@code ck_estabelecimento_formas_pagamento} e {@code ck_pedido_forma_pagamento}, V13).
 */
public enum FormaPagamento {

	DINHEIRO("em dinheiro"),
	PIX("por Pix"),
	CREDITO("por cartão de crédito"),
	DEBITO("por cartão de débito"),
	VR("por vale-refeição");

	private final String naMensagem;

	FormaPagamento(String naMensagem) {
		this.naMensagem = naMensagem;
	}

	/** Como a forma entra na mensagem de confirmação: "O pagamento é feito na retirada, por Pix." */
	public String naMensagem() {
		return naMensagem;
	}

	/** Todos os códigos, na ordem da lista: as formas de uma loja nova (V13). */
	public static List<String> todas() {
		return Arrays.stream(values()).map(Enum::name).toList();
	}

	/** A forma do código, ou vazio quando o código não está na lista. */
	public static Optional<FormaPagamento> doCodigo(String codigo) {
		return Arrays.stream(values()).filter(forma -> forma.name().equals(codigo)).findFirst();
	}

	/**
	 * Os códigos recebidos, sem repetir e na ordem da lista, ou vazio quando algum não está nela
	 * (ou é nulo).
	 */
	public static Optional<List<String>> ordenar(Collection<String> codigos) {
		if (codigos.stream().anyMatch(codigo -> doCodigo(codigo).isEmpty())) {
			return Optional.empty();
		}
		return Optional.of(todas().stream().filter(codigos::contains).toList());
	}

}
