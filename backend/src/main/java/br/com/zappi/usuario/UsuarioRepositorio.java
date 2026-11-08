package br.com.zappi.usuario;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepositorio extends JpaRepository<Usuario, Long> {

	/** O e-mail é único no sistema e fica gravado em minúsculas (ISO 27002 5.16). */
	Optional<Usuario> findByEmail(String email);

}
