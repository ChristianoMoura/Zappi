package br.com.zappi.pedido;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ItemPedidoRepositorio extends JpaRepository<ItemPedido, Long> {

	/** Itens de vários pedidos numa consulta só, já com o produto e a unidade. */
	@Query("""
			select i from ItemPedido i
			join fetch i.produto p
			join fetch p.unidadeMedida
			where i.pedido.id in :pedidos
			order by i.id
			""")
	List<ItemPedido> buscarDosPedidos(@Param("pedidos") Collection<Long> pedidos);

}
