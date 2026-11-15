package br.com.zappi.produto;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Toda busca filtra pelo estabelecimento da usuária logada (RN01, ISO 27002 5.34), e os
 * produtos excluídos nunca aparecem (RN14). Fora do cardápio (ZAP-151) é outro estado: o
 * produto continua no painel, mas sai do cardápio público e não entra em pedido novo.
 */
public interface ProdutoRepositorio extends JpaRepository<Produto, Long> {

	/**
	 * Todos os não excluídos, no cardápio e fora dele (ZAP-151), na ordem das listas (ZAP-136):
	 * categoria na ordem da Lídia e, dentro dela, nome e id. Usada na tela de produtos do painel.
	 */
	@Query("""
			select p from Produto p join fetch p.unidadeMedida join fetch p.categoria c
			where p.estabelecimento.id = :estabelecimentoId and p.ativo = true
			order by c.ordem, c.id, p.nome, p.id
			""")
	List<Produto> listarAtivosNaOrdem(@Param("estabelecimentoId") Long estabelecimentoId);

	/**
	 * Só os que o cliente vê: não excluídos e no cardápio (ZAP-151), na mesma ordem da lista do
	 * painel. Usada no cardápio público.
	 */
	@Query("""
			select p from Produto p join fetch p.unidadeMedida join fetch p.categoria c
			where p.estabelecimento.id = :estabelecimentoId and p.ativo = true and p.noCardapio = true
			order by c.ordem, c.id, p.nome, p.id
			""")
	List<Produto> listarNoCardapioNaOrdem(@Param("estabelecimentoId") Long estabelecimentoId);

	/** Não excluído, no cardápio ou fora dele: a Lídia pode ver e editar o que tirou (ZAP-151). */
	@EntityGraph(attributePaths = { "unidadeMedida", "categoria" })
	Optional<Produto> findByIdAndEstabelecimentoIdAndAtivoTrue(Long id, Long estabelecimentoId);

	/**
	 * Não excluídos e do estabelecimento (ZAP-88), no cardápio ou fora dele. Quem cadastra o
	 * pedido confere {@link Produto#isNoCardapio()}, para explicar por que o item foi recusado.
	 */
	@EntityGraph(attributePaths = "unidadeMedida")
	List<Produto> findByIdInAndEstabelecimentoIdAndAtivoTrue(Collection<Long> ids, Long estabelecimentoId);

	/** A categoria ainda tem produto não excluído? Então não pode ser excluída (ZAP-136). */
	boolean existsByCategoriaIdAndAtivoTrue(Long categoriaId);

}
