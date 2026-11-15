package br.com.zappi.notificacao;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Toda consulta filtra pelo estabelecimento da usuária logada (RN01, ISO 27002 5.15). */
public interface NotificacaoRepositorio extends JpaRepository<Notificacao, Long> {

	/**
	 * Grava o aviso só se ainda não existe: a restrição única (pedido, tipo, momento) da V10
	 * descarta a repetição sem erro, mesmo com duas abas consultando ao mesmo tempo.
	 *
	 * @return 1 se gravou, 0 se o aviso já existia
	 */
	@Modifying
	@Query(nativeQuery = true, value = """
			insert into notificacao (estabelecimento_id, pedido_id, tipo, momento)
			values (:estabelecimento, :pedido, :tipo, :momento)
			on conflict do nothing
			""")
	int gravarSeNaoExiste(@Param("estabelecimento") Long estabelecimentoId, @Param("pedido") Long pedidoId,
			@Param("tipo") short tipo, @Param("momento") String momento);

	/** Não vistas desde {@code desde}, para o número sobre o sino. */
	long countByEstabelecimentoIdAndVistaEmIsNullAndCriadoEmGreaterThanEqual(Long estabelecimentoId,
			OffsetDateTime desde);

	/** Notificações desde {@code desde}, mais recentes primeiro, com o pedido para montar o texto. */
	@Query("""
			select n from Notificacao n join fetch n.pedido
			where n.estabelecimentoId = :estabelecimento and n.criadoEm >= :desde
			order by n.criadoEm desc, n.id desc
			""")
	List<Notificacao> recentes(@Param("estabelecimento") Long estabelecimentoId, @Param("desde") OffsetDateTime desde);

	/**
	 * Marca como vistas as notificações da loja com esses ids. Ids de outra loja ou que não
	 * existem são ignorados, e as já vistas mantêm a primeira data.
	 */
	@Modifying
	@Query("""
			update Notificacao n set n.vistaEm = :agora
			where n.estabelecimentoId = :estabelecimento and n.id in :ids and n.vistaEm is null
			""")
	int marcarVistas(@Param("estabelecimento") Long estabelecimentoId, @Param("ids") Collection<Long> ids,
			@Param("agora") OffsetDateTime agora);

}
