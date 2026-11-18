package br.com.zappi.cardapio;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.zappi.armazenamento.ArmazenamentoDeFotos;
import br.com.zappi.armazenamento.ArmazenamentoDoEstabelecimento;
import br.com.zappi.cardapio.RespostaCardapio.LojaDoCardapio;
import br.com.zappi.cardapio.RespostaCardapio.ProdutoDoCardapio;
import br.com.zappi.categoria.RespostaCategoria;
import br.com.zappi.estabelecimento.Estabelecimento;
import br.com.zappi.estabelecimento.EstabelecimentoNaoEncontradoException;
import br.com.zappi.estabelecimento.EstabelecimentoRepositorio;
import br.com.zappi.produto.ProdutoRepositorio;

/**
 * Leitura do cardápio público pelo link da loja (ZAP-104), sem login (RN02). A loja é achada
 * pelo {@code slug}, e só os produtos dela não excluídos e no cardápio aparecem (RN01, RN14,
 * ZAP-151), na ordem das categorias da Lídia (ZAP-136). Categoria sem produto no cardápio não
 * aparece para o cliente.
 */
@Service
public class ServicoCardapio {

	private final EstabelecimentoRepositorio estabelecimentos;

	private final ProdutoRepositorio produtos;

	private final ArmazenamentoDeFotos fotosDosProdutos;

	private final ArmazenamentoDoEstabelecimento fotosDaLoja;

	public ServicoCardapio(EstabelecimentoRepositorio estabelecimentos, ProdutoRepositorio produtos,
			ArmazenamentoDeFotos fotosDosProdutos, ArmazenamentoDoEstabelecimento fotosDaLoja) {
		this.estabelecimentos = estabelecimentos;
		this.produtos = produtos;
		this.fotosDosProdutos = fotosDosProdutos;
		this.fotosDaLoja = fotosDaLoja;
	}

	/** Cardápio da loja; link que não leva a nenhuma loja ativa recebe 404. */
	@Transactional(readOnly = true)
	public RespostaCardapio buscar(String slug) {
		Estabelecimento loja = estabelecimentos.findBySlugAndAtivoTrue(slug)
			.orElseThrow(EstabelecimentoNaoEncontradoException::new);
		LojaDoCardapio dadosDaLoja = new LojaDoCardapio(loja.getNome(), loja.getSlug(), loja.getDescricao(),
				loja.getTelefoneWhatsapp(), fotosDaLoja.enderecoPublico(loja.getLogoCaminho()),
				fotosDaLoja.enderecoPublico(loja.getCapaCaminho()), loja.isDestacarPromocoes(),
				loja.getFormasPagamento());
		// As categorias saem dos próprios produtos, que já vêm na ordem delas
		Map<Long, RespostaCategoria> categorias = new LinkedHashMap<>();
		List<ProdutoDoCardapio> doCardapio = produtos.listarNoCardapioNaOrdem(loja.getId())
			.stream()
			.map(produto -> new ProdutoDoCardapio(produto.getId(), produto.getNome(),
					categorias.computeIfAbsent(produto.getCategoria().getId(),
							id -> RespostaCategoria.de(produto.getCategoria())),
					produto.getUnidadeMedida().getSigla(), produto.getPreco(), produto.getPrecoPromocional(),
					produto.getDescricao(),
					fotosDosProdutos.enderecoPublico(produto.getFotoCaminho()), produto.getFotoTextoAlternativo(),
					produto.getAlergenos(), produto.getOutrosAlergenos()))
			.toList();
		return new RespostaCardapio(dadosDaLoja, List.copyOf(categorias.values()), doCardapio);
	}

}
