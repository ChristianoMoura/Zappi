package br.com.zappi.pedido;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

/** Toda busca filtra pelo estabelecimento da usuária logada (RN01, ISO 27002 5.34). */
public interface PedidoRepositorio extends JpaRepository<Pedido, Long> {

	@EntityGraph(attributePaths = "cliente")
	List<Pedido> findByEstabelecimentoIdAndStatusIn(Long estabelecimentoId, Collection<StatusPedido> status, Sort ordem);

	/** O número ({@code #1}) é único por estabelecimento (RN09). */
	@EntityGraph(attributePaths = "cliente")
	Optional<Pedido> findByEstabelecimentoIdAndNumero(Long estabelecimentoId, Integer numero);

	/**
	 * Mesmo pedido, com a linha bloqueada até o fim da transação: duas ações ao mesmo tempo no
	 * mesmo pedido (ex.: dois cliques em "Confirmar") ficam uma depois da outra.
	 */
	/** Próximo número do estabelecimento (RN09). Chamar com o estabelecimento bloqueado. */
	@Query("select coalesce(max(p.numero), 0) + 1 from Pedido p where p.estabelecimento.id = :estabelecimento")
	Integer proximoNumero(@Param("estabelecimento") Long estabelecimentoId);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select p from Pedido p join fetch p.cliente where p.estabelecimento.id = :estabelecimento and p.numero = :numero")
	Optional<Pedido> buscarParaAlterar(@Param("estabelecimento") Long estabelecimentoId, @Param("numero") Integer numero);

}
