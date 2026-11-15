package br.com.zappi.termos;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AceiteTermosRepositorio extends JpaRepository<AceiteTermos, Long> {

	/** O aceite mais recente da usuária para uma versão dos textos. */
	Optional<AceiteTermos> findFirstByUsuarioIdAndVersaoOrderByAceitoEmDescIdDesc(Long usuarioId, int versao);

	/** O aceite mais recente da usuária, de qualquer versão. */
	Optional<AceiteTermos> findFirstByUsuarioIdOrderByAceitoEmDescIdDesc(Long usuarioId);

}
