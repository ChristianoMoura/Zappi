package br.com.zappi.cardapio;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.zappi.armazenamento.ArmazenamentoDeFotos;
import br.com.zappi.armazenamento.ArmazenamentoDoEstabelecimento;
import br.com.zappi.cardapio.RespostaCardapio.LojaDoCardapio;
import br.com.zappi.cardapio.RespostaCardapio.ProdutoDoCardapio;
import br.com.zappi.estabelecimento.Estabelecimento;
import br.com.zappi.estabelecimento.EstabelecimentoNaoEncontradoException;
import br.com.zappi.estabelecimento.EstabelecimentoRepositorio;
import br.com.zappi.produto.ProdutoRepositorio;

/**
 * Leitura do cardápio público pelo link da loja (ZAP-104), sem login (RN02). A loja é achada
 * pelo {@code slug}, e só os produtos ativos dela aparecem (RN01, RN14).
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
				fotosDaLoja.enderecoPublico(loja.getCapaCaminho()));
		return new RespostaCardapio(dadosDaLoja,
				produtos.findByEstabelecimentoIdAndAtivoTrueOrderByNomeAscSaborAscIdAsc(loja.getId())
					.stream()
					.map(produto -> new ProdutoDoCardapio(produto.getId(), produto.getNome(), produto.getSabor(),
							produto.getUnidadeMedida().getSigla(), produto.getPreco(), produto.getDescricao(),
							fotosDosProdutos.enderecoPublico(produto.getFotoCaminho()),
							produto.getFotoTextoAlternativo()))
					.toList());
	}

}
