package br.com.zappi.pedido;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

/** Toda busca filtra pelo estabelecimento da usuária logada (RN01, ISO 27002 5.34). */
public interface PedidoRepositorio extends JpaRepository<Pedido, Long> {

	@EntityGraph(attributePaths = "cliente")
	List<Pedido> findByEstabelecimentoIdAndStatusIn(Long estabelecimentoId, Collection<StatusPedido> status, Sort ordem);

	/** O número ({@code #1}) é único por estabelecimento (RN09). */
	@EntityGraph(attributePaths = "cliente")
	Optional<Pedido> findByEstabelecimentoIdAndNumero(Long estabelecimentoId, Integer numero);

}
