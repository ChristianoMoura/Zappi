package br.com.zappi.produto;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Toda busca filtra pelo estabelecimento da usuária logada (RN01, ISO 27002 5.34), e só
 * os produtos ativos aparecem (RN14).
 */
public interface ProdutoRepositorio extends JpaRepository<Produto, Long> {

	@EntityGraph(attributePaths = "unidadeMedida")
	List<Produto> findByEstabelecimentoIdAndAtivoTrueOrderByNomeAscSaborAscIdAsc(Long estabelecimentoId);

	@EntityGraph(attributePaths = "unidadeMedida")
	Optional<Produto> findByIdAndEstabelecimentoIdAndAtivoTrue(Long id, Long estabelecimentoId);

}
