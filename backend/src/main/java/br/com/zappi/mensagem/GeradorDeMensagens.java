package br.com.zappi.mensagem;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
 * Zappi" (CDC). Serve aos três tipos: confirmação (ZAP-49), recusa ou cancelamento e pronto
 * para retirada (ZAP-50), e monta o link {@code wa.me}.
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

	/**
	 * Texto da recusa e do cancelamento (tipo 2), o mesmo para os dois casos (ZAP-64). O motivo
	 * vai exatamente como a Lídia digitou (RN05).
	 */
	public String recusa(Pedido pedido) {
		return """
				Olá, %s.

				Infelizmente não vamos conseguir atender o seu pedido #%d para %s.

				Motivo: %s

				Se quiser combinar outra data ou outro pedido, é só responder esta mensagem.

				%s
				%s""".formatted(primeiroNome(pedido.getCliente().getNome()), pedido.getNumero(),
				dataDeRetirada(pedido.getDataRetirada()), pedido.getMotivoRecusa(), pedido.getEstabelecimento().getNome(),
				ASSINATURA);
	}

	/** Texto do pronto para retirada (tipo 3), gerado ao concluir o pedido. */
	public String pronto(Pedido pedido) {
		return """
				Olá, %s!

				Seu pedido #%d está pronto para retirada.

				Retirada: %s
				Total a pagar na retirada: %s

				Qualquer dúvida, é só responder esta mensagem.

				%s
				%s""".formatted(primeiroNome(pedido.getCliente().getNome()), pedido.getNumero(),
				dataDeRetirada(pedido.getDataRetirada()), moeda(pedido.getValorTotal()),
				pedido.getEstabelecimento().getNome(), ASSINATURA);
	}

	/**
	 * Link que abre o WhatsApp com a conversa do cliente e o texto pronto:
	 * {@code https://wa.me/<telefone>?text=<texto codificado>}. A Lídia só aperta enviar.
	 */
	public static String link(String telefone, String texto) {
		return "https://wa.me/" + telefone + "?text="
				+ URLEncoder.encode(texto, StandardCharsets.UTF_8).replace("+", "%20");
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

	/**
	 * "sábado, 14/11, às 15h" ou "sábado, 14/11, às 15h30", começando com "hoje," quando a
	 * retirada é no dia (ZAP-127).
	 */
	String dataDeRetirada(LocalDateTime retirada) {
		LocalDate data = retirada.toLocalDate();
		String texto = "%s, %02d/%02d, às %s".formatted(data.getDayOfWeek().getDisplayName(TextStyle.FULL, PORTUGUES),
				data.getDayOfMonth(), data.getMonthValue(), hora(retirada));
		return data.equals(LocalDate.now(relogio)) ? "hoje, " + texto : texto;
	}

	/** "15h", ou "15h30" fora da hora cheia. */
	static String hora(LocalDateTime retirada) {
		int minutos = retirada.getMinute();
		return minutos == 0 ? retirada.getHour() + "h" : "%dh%02d".formatted(retirada.getHour(), minutos);
	}

	static String primeiroNome(String nome) {
		return nome.trim().split("\\s+")[0];
	}

}
