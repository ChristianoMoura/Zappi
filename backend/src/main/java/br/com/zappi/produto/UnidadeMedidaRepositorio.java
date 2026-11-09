package br.com.zappi.produto;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UnidadeMedidaRepositorio extends JpaRepository<UnidadeMedida, Short> {

	/** Busca pela sigla mostrada na tela: {@code KG} ou {@code UN}. */
	Optional<UnidadeMedida> findBySigla(String sigla);

}
