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

	/**
	 * Pedidos aceitos pelo Portal do Cliente vindos do IP na última hora, em qualquer loja
	 * (ZAP-112). Os envios recusados não contam.
	 */
	@Query(nativeQuery = true, value = """
			select count(*) from log_auditoria
			where acao = 'PEDIDO_CRIADO' and detalhes ->> 'origem' = 'PORTAL_CLIENTE'
			  and ip_origem = :ip and criado_em > now() - interval '1 hour'
			""")
	long contarPedidosDoPortalPorIpNaUltimaHora(@Param("ip") String ip);

	/**
	 * Pedidos aceitos pelo Portal do Cliente para o cliente com esse WhatsApp na loja, nas
	 * últimas 24 horas (ZAP-112). O telefone não fica no log (LGPD): a busca passa pelo cliente.
	 */
	@Query(nativeQuery = true, value = """
			select count(*) from log_auditoria l
			join cliente c on c.id = cast(l.detalhes ->> 'clienteId' as bigint)
			where l.acao = 'PEDIDO_CRIADO' and l.detalhes ->> 'origem' = 'PORTAL_CLIENTE'
			  and l.estabelecimento_id = :estabelecimento and c.estabelecimento_id = :estabelecimento
			  and c.telefone_whatsapp = :telefone and l.criado_em > now() - interval '24 hours'
			""")
	long contarPedidosDoPortalPorTelefoneNoDia(@Param("estabelecimento") Long estabelecimentoId,
			@Param("telefone") String telefone);

}
