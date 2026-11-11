package br.com.zappi.auditoria;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LogAuditoriaRepositorio extends JpaRepository<LogAuditoria, Long> {

	/**
	 * Registros do estabelecimento cujos detalhes citam algum dos textos, sem diferença entre
	 * maiúsculas e minúsculas. Usado para tirar os dados de um cliente anonimizado (RN17).
	 */
	@Query(nativeQuery = true, value = """
			select * from log_auditoria
			where estabelecimento_id = :estabelecimento and detalhes is not null
			  and (strpos(lower(detalhes::text), lower(:texto1)) > 0 or strpos(lower(detalhes::text), lower(:texto2)) > 0)
			""")
	List<LogAuditoria> buscarDetalhesQueCitam(@Param("estabelecimento") Long estabelecimentoId,
			@Param("texto1") String texto1, @Param("texto2") String texto2);

}
