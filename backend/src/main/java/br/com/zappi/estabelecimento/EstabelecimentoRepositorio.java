package br.com.zappi.estabelecimento;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

/**
 * O estabelecimento é sempre buscado pelo id que vem do token, nunca da requisição (RN01,
 * ISO 27002 5.34).
 */
public interface EstabelecimentoRepositorio extends JpaRepository<Estabelecimento, Long> {

	/** O link do cardápio já é usado por outro estabelecimento? */
	boolean existsBySlugAndIdNot(String slug, Long id);

	/**
	 * Loja ativa pelo link do cardápio público (ZAP-104), a única busca que não vem do token. Loja
	 * desativada é tratada como link inexistente.
	 */
	Optional<Estabelecimento> findBySlugAndAtivoTrue(String slug);

	/**
	 * Estabelecimento com a linha bloqueada até o fim da transação. Dois pedidos cadastrados
	 * ao mesmo tempo ficam um depois do outro e recebem números seguidos (RN09).
	 */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select e from Estabelecimento e where e.id = :id")
	Optional<Estabelecimento> buscarParaNumerarPedido(@Param("id") Long id);

}
