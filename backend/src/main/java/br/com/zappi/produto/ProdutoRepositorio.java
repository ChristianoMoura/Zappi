package br.com.zappi.produto;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Toda busca filtra pelo estabelecimento da usuária logada (RN01, ISO 27002 5.34), e só
 * os produtos ativos aparecem (RN14).
 */
public interface ProdutoRepositorio extends JpaRepository<Produto, Long> {

	/**
	 * Ativos, na ordem das listas (ZAP-136): categoria na ordem da Lídia e, dentro dela, nome e
	 * id. Usada na lista do painel e no cardápio público.
	 */
	@Query("""
			select p from Produto p join fetch p.unidadeMedida join fetch p.categoria c
			where p.estabelecimento.id = :estabelecimentoId and p.ativo = true
			order by c.ordem, c.id, p.nome, p.id
			""")
	List<Produto> listarAtivosNaOrdem(@Param("estabelecimentoId") Long estabelecimentoId);

	@EntityGraph(attributePaths = { "unidadeMedida", "categoria" })
	Optional<Produto> findByIdAndEstabelecimentoIdAndAtivoTrue(Long id, Long estabelecimentoId);

	/** Produtos que podem entrar num pedido (ZAP-88): ativos e do estabelecimento. */
	@EntityGraph(attributePaths = "unidadeMedida")
	List<Produto> findByIdInAndEstabelecimentoIdAndAtivoTrue(Collection<Long> ids, Long estabelecimentoId);

	/** A categoria ainda tem produto não excluído? Então não pode ser excluída (ZAP-136). */
	boolean existsByCategoriaIdAndAtivoTrue(Long categoriaId);

}
