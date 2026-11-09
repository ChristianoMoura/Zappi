package br.com.zappi.mensagem;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MensagemWhatsappRepositorio extends JpaRepository<MensagemWhatsapp, Long> {

	/** Mensagens geradas para o pedido, da mais antiga para a mais nova. */
	List<MensagemWhatsapp> findByPedidoIdOrderByCriadoEmAscIdAsc(Long pedidoId);

}
