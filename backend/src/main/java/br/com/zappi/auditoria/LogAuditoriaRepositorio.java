package br.com.zappi.auditoria;

import org.springframework.data.jpa.repository.JpaRepository;

public interface LogAuditoriaRepositorio extends JpaRepository<LogAuditoria, Long> {

}
