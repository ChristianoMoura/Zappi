package br.com.zappi.termos;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Optional;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.zappi.auditoria.AcaoAuditoria;
import br.com.zappi.auditoria.RegistroAuditoria;
import br.com.zappi.auditoria.ServicoAuditoria;

/**
 * Versão vigente dos Termos de uso e da Política de privacidade e o aceite da Lídia (ZAP-146, RN27,
 * LGPD, ISO 27002 5.34 e 8.16). O aceite fica no servidor, com versão, data, IP e navegador, e
 * também no log de auditoria.
 */
@Service
@EnableConfigurationProperties(PropriedadesTermos.class)
public class ServicoTermos {

	private final PropriedadesTermos propriedades;

	private final AceiteTermosRepositorio aceites;

	private final ServicoAuditoria auditoria;

	public ServicoTermos(PropriedadesTermos propriedades, AceiteTermosRepositorio aceites, ServicoAuditoria auditoria) {
		this.propriedades = propriedades;
		this.aceites = aceites;
		this.auditoria = auditoria;
	}

	public TermosVigentes vigentes() {
		return new TermosVigentes(propriedades.versao(), propriedades.data());
	}

	public int versaoVigente() {
		return propriedades.versao();
	}

	/** O aceite mais recente da versão vigente, ou vazio se a usuária ainda não aceitou essa versão. */
	@Transactional(readOnly = true)
	public Optional<TermosAceitos> aceiteDaVersaoVigente(Long usuarioId) {
		return aceites.findFirstByUsuarioIdAndVersaoOrderByAceitoEmDescIdDesc(usuarioId, propriedades.versao())
			.map(AceiteTermos::comoTermosAceitos);
	}

	/** O aceite mais recente, de qualquer versão, para a tela "Termos e privacidade". */
	@Transactional(readOnly = true)
	public Optional<TermosAceitos> ultimoAceite(Long usuarioId) {
		return aceites.findFirstByUsuarioIdOrderByAceitoEmDescIdDesc(usuarioId).map(AceiteTermos::comoTermosAceitos);
	}

	/**
	 * Grava o aceite da versão vigente e o {@code TERMOS_ACEITOS} no log, na transação de quem chama
	 * (o login): se o login falhar depois, os dois são desfeitos. Cada chamada é um registro novo,
	 * inclusive para a mesma versão em outro aparelho. O IP e o navegador do log vêm da requisição.
	 */
	@Transactional
	public TermosAceitos registrarAceite(Long usuarioId, Long estabelecimentoId, String ipOrigem, String userAgent) {
		AceiteTermos aceite = aceites.save(new AceiteTermos(usuarioId, propriedades.versao(),
				OffsetDateTime.now(ZoneOffset.UTC), ipOrigem, userAgent));
		auditoria.registrar(RegistroAuditoria.de(AcaoAuditoria.TERMOS_ACEITOS)
			.estabelecimento(estabelecimentoId)
			.usuario(usuarioId)
			.entidade("aceite_termos", aceite.getId())
			.detalhes(Map.of("versao", aceite.getVersao())));
		return aceite.comoTermosAceitos();
	}

}
