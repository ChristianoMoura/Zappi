package br.com.zappi.mensagem;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import br.com.zappi.pedido.ItemPedido;
import br.com.zappi.pedido.Pedido;
import br.com.zappi.produto.UnidadeMedida;

/**
 * Monta os textos das mensagens ao cliente aprovados na ZAP-63 ({@code docs/mensagens-whatsapp.md}):
 * linguagem simples (NBR 17225 5.12.12), sem emojis e terminando com "Mensagem gerada pelo
 * Zappi" (CDC). Por enquanto só a confirmação (ZAP-49); a recusa e o pronto chegam na ZAP-50.
 */
@Component
public class GeradorDeMensagens {

	private static final Locale PORTUGUES = Locale.forLanguageTag("pt-BR");

	/** "Hoje" é contado no fuso da Casa Belt, não no do servidor. */
	private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

	private static final String ASSINATURA = "Mensagem gerada pelo Zappi";

	private final Clock relogio;

	@Autowired
	public GeradorDeMensagens() {
		this(Clock.system(FUSO));
	}

	GeradorDeMensagens(Clock relogio) {
		this.relogio = relogio;
	}

	/** Texto da confirmação (tipo 1), gerado ao confirmar um pedido Novo (ZAP-49). */
	public String confirmacao(Pedido pedido, List<ItemPedido> itens) {
		String linhasDosItens = itens.stream().map(GeradorDeMensagens::linhaDoItem).collect(Collectors.joining("\n"));
		return """
				Olá, %s!

				Seu pedido #%d na %s está confirmado.

				%s
				Total: %s
				Retirada: %s

				O pagamento é feito na retirada. Qualquer dúvida, é só responder esta mensagem.

				%s""".formatted(primeiroNome(pedido.getCliente().getNome()), pedido.getNumero(),
				pedido.getEstabelecimento().getNome(), linhasDosItens, moeda(pedido.getValorTotal()),
				dataDeRetirada(pedido.getDataRetirada()), ASSINATURA);
	}

	/** "- Bolo de brigadeiro de chocolate (2 kg)", do mesmo jeito que a tela escreve o item. */
	static String linhaDoItem(ItemPedido item) {
		String produto = item.getProduto().getNome();
		String sabor = item.getProduto().getSabor();
		String nome = "Bolo".equals(produto) ? "Bolo de " + sabor.toLowerCase(PORTUGUES) : sabor;
		return "- " + nome + " (" + quantidade(item) + ")";
	}

	/** KG aceita fração ("1,5 kg"); UN não ("100 un") (RN12). */
	static String quantidade(ItemPedido item) {
		BigDecimal quantidade = item.getQuantidade().stripTrailingZeros();
		if (item.getProduto().getUnidadeMedida().getId() == UnidadeMedida.QUILOGRAMA) {
			NumberFormat numero = NumberFormat.getNumberInstance(PORTUGUES);
			numero.setMaximumFractionDigits(3);
			return numero.format(quantidade) + " kg";
		}
		return quantidade.toPlainString() + " un";
	}

	/** "R$ 200,00", com espaço comum depois do "R$". */
	static String moeda(BigDecimal valor) {
		return NumberFormat.getCurrencyInstance(PORTUGUES).format(valor).replace(' ', ' ');
	}

	/** "sábado, 14/11", ou "hoje, sábado, 07/11" quando a retirada é no dia. */
	String dataDeRetirada(LocalDate data) {
		String texto = "%s, %02d/%02d".formatted(data.getDayOfWeek().getDisplayName(TextStyle.FULL, PORTUGUES),
				data.getDayOfMonth(), data.getMonthValue());
		return data.equals(LocalDate.now(relogio)) ? "hoje, " + texto : texto;
	}

	static String primeiroNome(String nome) {
		return nome.trim().split("\\s+")[0];
	}

}
