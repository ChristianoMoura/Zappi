package br.com.zappi.mensagem;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MensagemWhatsappRepositorio extends JpaRepository<MensagemWhatsapp, Long> {

	/** Mensagens geradas para o pedido, da mais antiga para a mais nova. */
	List<MensagemWhatsapp> findByPedidoIdOrderByCriadoEmAscIdAsc(Long pedidoId);

	/** A mensagem só é encontrada se for daquele pedido, no estabelecimento do token (RN01). */
	@Query("""
			select m from MensagemWhatsapp m join m.pedido p
			where m.id = :id and p.numero = :numero and p.estabelecimento.id = :estabelecimento
			""")
	Optional<MensagemWhatsapp> buscarDoPedido(@Param("id") Long id, @Param("numero") Integer numero,
			@Param("estabelecimento") Long estabelecimentoId);

}
