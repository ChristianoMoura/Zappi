package br.com.zappi.pedido;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import tools.jackson.databind.annotation.JsonDeserialize;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Corpo do cadastro (ZAP-88) e da edição (ZAP-90) do pedido. Os textos chegam sem os espaços
 * das pontas, e os opcionais em branco viram nulos. O preço e o total não vêm da tela: o
 * backend usa o preço do cardápio (RN10) e calcula o total (RN11). Campos a mais, como o
 * {@code precoUnitario} que a tela manda, são ignorados.
 *
 * @param site campo invisível do formulário do Portal do Cliente (ZAP-112): pessoas não veem
 *        nem preenchem; se vier preenchido, o envio foi feito por um robô e é descartado. No
 *        painel, é ignorado
 * @param formaPagamento código da forma de pagamento combinada (ZAP-190), ex.: {@code "PIX"}.
 *        Obrigatória e entre as que a loja aceita, conferida no serviço; na edição, a forma que já
 *        estava no pedido pode ficar, mesmo que a loja tenha deixado de aceitá-la
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record RequisicaoPedido(
		@NotNull(message = "Informe o cliente.") @Valid ClienteDaRequisicao cliente,
		@NotNull(message = CONSENTIMENTO) @AssertTrue(message = CONSENTIMENTO) Boolean consentimentoLgpd,
		@NotNull(message = "Escolha a data e o horário de retirada.") @JsonDeserialize(using = DataHoraDeSaoPaulo.class)
		LocalDateTime dataRetirada,
		@Size(max = 500, message = "Use no máximo 500 caracteres.") String observacao,
		@NotEmpty(message = "Adicione pelo menos um item.") @Size(max = 100, message = "Use no máximo 100 itens.")
		List<@NotNull(message = "Escolha o produto.") @Valid ItemDaRequisicao> itens,
		@Size(max = 200, message = "Use no máximo 200 caracteres.") String site,
		String formaPagamento) {

	static final String CONSENTIMENTO = "Confirme que o cliente autorizou o uso do nome e do WhatsApp.";

	static final String MAXIMO_100 = "Use no máximo 100 caracteres.";

	public RequisicaoPedido {
		observacao = opcional(observacao);
		site = opcional(site);
		formaPagamento = opcional(formaPagamento);
	}

	/** Cliente pelo WhatsApp com 55 e DDD, ex.: {@code 5511900000000} (RN01). */
	@JsonIgnoreProperties(ignoreUnknown = true)
	public record ClienteDaRequisicao(
			@NotBlank(message = "Escreva o nome do cliente.") @Size(max = 100, message = MAXIMO_100) String nome,
			@NotBlank(message = "Escreva o WhatsApp do cliente com DDD.")
			@Pattern(regexp = "55\\d{11}", message = "O WhatsApp precisa ter DDD e 9 números. Ex.: (11) 90000-0000")
			String telefone) {

		public ClienteDaRequisicao {
			nome = nome == null ? null : nome.strip();
			telefone = telefone == null ? null : telefone.strip();
		}

	}

	/**
	 * Item pelo id do produto. A quantidade aceita até 3 casas (RN12); produto vendido por
	 * unidade só aceita número inteiro, conferido no serviço. Recheio e cobertura não existem
	 * mais (ZAP-136): se uma tela antiga mandar, são ignorados. A observação tem até 300
	 * caracteres em item novo; o item que já estava no pedido pode manter até 600, o tamanho da
	 * observação dos pedidos antigos com o recheio e a cobertura copiados (conferido no serviço).
	 */
	@JsonIgnoreProperties(ignoreUnknown = true)
	public record ItemDaRequisicao(@NotNull(message = "Escolha o produto.") Long produtoId,
			@NotNull(message = "Escreva a quantidade.")
			@DecimalMin(value = "0", inclusive = false, message = "A quantidade precisa ser um número maior que zero.")
			@DecimalMax(value = "99999.999", message = "Confira a quantidade: ela está alta demais.")
			@Digits(integer = 10, fraction = 3, message = "Use no máximo 3 casas depois da vírgula. Ex.: 1,5")
			BigDecimal quantidade,
			@Size(max = MAXIMO_OBSERVACAO_ANTIGA, message = "Use no máximo 300 caracteres.") String observacao) {

		/** Observação de item novo (ZAP-136). */
		static final int MAXIMO_OBSERVACAO = 300;

		/** Tamanho da coluna: observação de item antigo com o recheio e a cobertura copiados. */
		static final int MAXIMO_OBSERVACAO_ANTIGA = 600;

		public ItemDaRequisicao {
			observacao = opcional(observacao);
		}

	}

	private static String opcional(String texto) {
		if (texto == null) {
			return null;
		}
		String limpo = texto.strip();
		return limpo.isEmpty() ? null : limpo;
	}

}
