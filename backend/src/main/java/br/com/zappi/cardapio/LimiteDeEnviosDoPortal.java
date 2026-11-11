package br.com.zappi.cardapio;

import java.util.Map;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import br.com.zappi.auditoria.AcaoAuditoria;
import br.com.zappi.auditoria.LogAuditoriaRepositorio;
import br.com.zappi.auditoria.RegistroAuditoria;
import br.com.zappi.auditoria.ServicoAuditoria;

/**
 * Limite de envios do Portal do Cliente (ZAP-112, ZAP-103): no máximo 5 pedidos por hora pelo
 * mesmo IP e 3 a cada 24 horas pelo mesmo WhatsApp na loja, para o quadro da Lídia não se encher
 * de pedidos falsos. A contagem usa os {@code PEDIDO_CRIADO} do portal no {@code log_auditoria},
 * como o bloqueio de login, então vale mesmo depois de o servidor reiniciar. Só os pedidos
 * aceitos contam.
 */
@Component
public class LimiteDeEnviosDoPortal {

	static final int POR_IP_NA_HORA = 5;

	static final int POR_TELEFONE_NO_DIA = 3;

	private final LogAuditoriaRepositorio logs;

	private final ServicoAuditoria auditoria;

	public LimiteDeEnviosDoPortal(LogAuditoriaRepositorio logs, ServicoAuditoria auditoria) {
		this.logs = logs;
		this.auditoria = auditoria;
	}

	/**
	 * Recusa o envio acima do limite, registrando a recusa no log numa transação própria (ISO
	 * 27002 8.16), sem o telefone (LGPD).
	 *
	 * @throws EnviosDemaisException acima do limite
	 */
	@Transactional(readOnly = true)
	public void conferir(Long estabelecimentoId, String telefone, String ip) {
		String motivo = null;
		if (ip != null && logs.contarPedidosDoPortalPorIpNaUltimaHora(ip) >= POR_IP_NA_HORA) {
			motivo = "LIMITE_POR_IP";
		}
		else if (logs.contarPedidosDoPortalPorTelefoneNoDia(estabelecimentoId, telefone) >= POR_TELEFONE_NO_DIA) {
			motivo = "LIMITE_POR_TELEFONE";
		}
		if (motivo != null) {
			auditoria.registrarEmTransacaoPropria(RegistroAuditoria.de(AcaoAuditoria.PEDIDO_PUBLICO_RECUSADO)
				.estabelecimento(estabelecimentoId)
				.detalhes(Map.of("motivo", motivo, "origem", "PORTAL_CLIENTE")));
			throw new EnviosDemaisException();
		}
	}

}
