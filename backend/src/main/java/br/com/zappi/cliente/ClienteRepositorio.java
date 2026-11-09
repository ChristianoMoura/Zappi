package br.com.zappi.cliente;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * O cliente é único pelo WhatsApp dentro do estabelecimento (RN01): o mesmo telefone em
 * outro pedido é a mesma pessoa.
 */
public interface ClienteRepositorio extends JpaRepository<Cliente, Long> {

	Optional<Cliente> findByEstabelecimentoIdAndTelefoneWhatsapp(Long estabelecimentoId, String telefoneWhatsapp);

}
