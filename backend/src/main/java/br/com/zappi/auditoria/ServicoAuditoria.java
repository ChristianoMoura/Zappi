package br.com.zappi.auditoria;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.UnaryOperator;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Componente único que grava a trilha de auditoria (ISO 27002 8.16). Usado por login,
 * estabelecimento, produtos e pedidos.
 */
@Service
public class ServicoAuditoria {

	private final LogAuditoriaRepositorio repositorio;

	public ServicoAuditoria(LogAuditoriaRepositorio repositorio) {
		this.repositorio = repositorio;
	}

	/**
	 * Grava na mesma transação de quem chamou (RN08): se a operação falhar, o registro
	 * também é desfeito.
	 */
	@Transactional
	public LogAuditoria registrar(RegistroAuditoria registro) {
		return repositorio.save(montar(registro));
	}

	/**
	 * Grava em uma transação separada, que é confirmada mesmo se a operação de quem chamou
	 * falhar. Use para {@link AcaoAuditoria#LOGIN_FALHA}, que precisa ficar registrado
	 * para o bloqueio de login (RF02).
	 */
	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public LogAuditoria registrarEmTransacaoPropria(RegistroAuditoria registro) {
		return repositorio.save(montar(registro));
	}

	/**
	 * Tira dados pessoais dos detalhes já gravados, ao anonimizar um cliente (RN17, LGPD). Os
	 * registros do estabelecimento que citam {@code procurado1} ou {@code procurado2} têm cada
	 * texto dos detalhes, em qualquer nível, passado por {@code troca}. Os registros continuam,
	 * com a mesma ação, data e autor (ISO 27002 8.16). Grava na transação de quem chamou.
	 *
	 * @return quantos registros mudaram
	 */
	@Transactional
	public int substituirNosDetalhes(Long estabelecimentoId, String procurado1, String procurado2,
			UnaryOperator<String> troca) {
		int alterados = 0;
		for (LogAuditoria registro : repositorio.buscarDetalhesQueCitam(estabelecimentoId, procurado1, procurado2)) {
			@SuppressWarnings("unchecked")
			Map<String, Object> novos = (Map<String, Object>) trocarTextos(registro.getDetalhes(), troca);
			if (!novos.equals(registro.getDetalhes())) {
				registro.substituirDetalhes(novos);
				alterados++;
			}
		}
		repositorio.flush();
		return alterados;
	}

	/** Copia o valor do JSON trocando cada texto; números, booleanos e nulos ficam iguais. */
	private static Object trocarTextos(Object valor, UnaryOperator<String> troca) {
		if (valor instanceof String texto) {
			return troca.apply(texto);
		}
		if (valor instanceof Map<?, ?> mapa) {
			Map<String, Object> copia = new LinkedHashMap<>();
			mapa.forEach((chave, item) -> copia.put(String.valueOf(chave), trocarTextos(item, troca)));
			return copia;
		}
		if (valor instanceof List<?> lista) {
			List<Object> copia = new ArrayList<>();
			lista.forEach(item -> copia.add(trocarTextos(item, troca)));
			return copia;
		}
		return valor;
	}

	private static LogAuditoria montar(RegistroAuditoria registro) {
		HttpServletRequest requisicao = requisicaoAtual();
		String ipOrigem = requisicao == null ? null : requisicao.getRemoteAddr();
		String userAgent = requisicao == null ? null : requisicao.getHeader("User-Agent");

		return new LogAuditoria(
				registro.acao(),
				registro.estabelecimentoId(),
				registro.usuarioId(),
				limitar(registro.entidade(), LogAuditoria.TAMANHO_ENTIDADE),
				registro.entidadeId(),
				limitar(registro.emailInformado(), LogAuditoria.TAMANHO_EMAIL),
				limitar(ipOrigem, LogAuditoria.TAMANHO_IP),
				limitar(userAgent, LogAuditoria.TAMANHO_USER_AGENT),
				registro.detalhes(),
				OffsetDateTime.now(ZoneOffset.UTC));
	}

	/** Requisição HTTP em andamento, ou nulo fora de uma requisição (ex.: tarefas internas). */
	private static HttpServletRequest requisicaoAtual() {
		if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes atributos) {
			return atributos.getRequest();
		}
		return null;
	}

	/** Corta o texto no tamanho da coluna, para o log nunca falhar por um valor longo. */
	private static String limitar(String texto, int tamanhoMaximo) {
		if (texto == null || texto.length() <= tamanhoMaximo) {
			return texto;
		}
		return texto.substring(0, tamanhoMaximo);
	}

}
