package br.com.zappi.categoria;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Toda busca filtra pelo estabelecimento da usuária logada (RN01, ISO 27002 5.34), e só as
 * categorias ativas aparecem (RN14).
 */
public interface CategoriaRepositorio extends JpaRepository<Categoria, Long> {

	/** Na ordem da Lídia; o id desempata. */
	List<Categoria> findByEstabelecimentoIdAndAtivoTrueOrderByOrdemAscIdAsc(Long estabelecimentoId);

	Optional<Categoria> findByIdAndEstabelecimentoIdAndAtivoTrue(Long id, Long estabelecimentoId);

	/**
	 * Já existe outra categoria ativa da loja com esse nome, sem diferenciar maiúsculas? Na
	 * criação, {@code idIgnorado} é nulo.
	 */
	@Query("""
			select count(c) > 0 from Categoria c
			where c.estabelecimento.id = :estabelecimentoId and c.ativo = true
			and lower(c.nome) = lower(:nome) and (:idIgnorado is null or c.id <> :idIgnorado)
			""")
	boolean nomeEmUso(@Param("estabelecimentoId") Long estabelecimentoId, @Param("nome") String nome,
			@Param("idIgnorado") Long idIgnorado);

	/** Posição do fim da lista: a maior ordem das ativas, ou 0 sem categorias. */
	@Query("select coalesce(max(c.ordem), 0) from Categoria c where c.estabelecimento.id = :estabelecimentoId and c.ativo = true")
	int ultimaOrdem(@Param("estabelecimentoId") Long estabelecimentoId);

}
