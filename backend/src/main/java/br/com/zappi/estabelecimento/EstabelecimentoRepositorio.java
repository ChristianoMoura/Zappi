package br.com.zappi.estabelecimento;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * O estabelecimento é sempre buscado pelo id que vem do token, nunca da requisição (RN01,
 * ISO 27002 5.34).
 */
public interface EstabelecimentoRepositorio extends JpaRepository<Estabelecimento, Long> {

	/** O link do cardápio já é usado por outro estabelecimento? */
	boolean existsBySlugAndIdNot(String slug, Long id);

}
