package br.com.zappi.estabelecimento;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import br.com.zappi.armazenamento.ArmazenamentoDoEstabelecimento;
import br.com.zappi.armazenamento.ArmazenamentoIndisponivelException;
import br.com.zappi.auditoria.AcaoAuditoria;
import br.com.zappi.auditoria.RegistroAuditoria;
import br.com.zappi.auditoria.ServicoAuditoria;
import br.com.zappi.seguranca.UsuarioAutenticado;

/**
 * Consulta e edição do estabelecimento da usuária logada (RF03, RF04). O estabelecimento vem
 * do token, nunca da requisição (RN01, ISO 27002 5.15 e 5.34). Cada edição vai para o log de
 * auditoria na mesma transação (ISO 27002 8.16).
 */
@Service
public class ServicoEstabelecimento {

	private static final String ENTIDADE = "estabelecimento";

	private static final String RESTRICAO_SLUG = "uk_estabelecimento_slug";

	private final EstabelecimentoRepositorio estabelecimentos;

	private final ServicoAuditoria auditoria;

	private final ArmazenamentoDoEstabelecimento armazenamento;

	public ServicoEstabelecimento(EstabelecimentoRepositorio estabelecimentos, ServicoAuditoria auditoria,
			ArmazenamentoDoEstabelecimento armazenamento) {
		this.estabelecimentos = estabelecimentos;
		this.auditoria = auditoria;
		this.armazenamento = armazenamento;
	}

	@Transactional(readOnly = true)
	public RespostaEstabelecimento buscar(UsuarioAutenticado usuario) {
		return resposta(encontrar(usuario));
	}

	@Transactional
	public RespostaEstabelecimento editar(UsuarioAutenticado usuario, RequisicaoEstabelecimento dados) {
		Estabelecimento estabelecimento = encontrar(usuario);
		if (estabelecimentos.existsBySlugAndIdNot(dados.slug(), estabelecimento.getId())) {
			throw new LinkEmUsoException();
		}
		Map<String, Object> antes = retrato(estabelecimento);

		estabelecimento.atualizar(dados, agora());
		gravar();

		registrar(usuario, estabelecimento, antes);
		return resposta(estabelecimento);
	}

	/**
	 * Envia o logo ou a capa para o Storage e troca a da loja (ZAP-119), como a foto do produto
	 * (ZAP-40). O nome do arquivo é novo a cada envio, para o navegador não mostrar a foto
	 * antiga guardada. A antiga só é apagada depois que o banco confirmar a troca; se a troca
	 * falhar, a nova é apagada.
	 */
	@Transactional
	public RespostaEstabelecimento enviarFoto(UsuarioAutenticado usuario, FotoDoEstabelecimento foto,
			ArquivoDeFoto arquivo) {
		if (!armazenamento.disponivel()) {
			throw new ArmazenamentoIndisponivelException("Storage não configurado", null);
		}
		Estabelecimento estabelecimento = encontrar(usuario);
		Map<String, Object> antes = retrato(estabelecimento);
		String fotoAntiga = foto.caminho(estabelecimento);

		String caminho = estabelecimento.getId() + "/" + foto.nome() + "-"
				+ UUID.randomUUID().toString().substring(0, 8) + "." + arquivo.tipo().extensao();
		armazenamento.enviar(caminho, arquivo.conteudo(), arquivo.tipo().mime());
		depoisDaTransacao(caminho, fotoAntiga);

		foto.trocar(estabelecimento, caminho, agora());
		estabelecimentos.flush();
		registrar(usuario, estabelecimento, antes);
		return resposta(estabelecimento);
	}

	/** Tira o logo ou a capa da loja e apaga o arquivo do Storage depois da confirmação. */
	@Transactional
	public RespostaEstabelecimento removerFoto(UsuarioAutenticado usuario, FotoDoEstabelecimento foto) {
		Estabelecimento estabelecimento = encontrar(usuario);
		String fotoAntiga = foto.caminho(estabelecimento);
		if (fotoAntiga == null) {
			return resposta(estabelecimento);
		}
		Map<String, Object> antes = retrato(estabelecimento);

		foto.trocar(estabelecimento, null, agora());
		estabelecimentos.flush();
		depoisDaTransacao(null, fotoAntiga);
		registrar(usuario, estabelecimento, antes);
		return resposta(estabelecimento);
	}

	/**
	 * Confirmada a transação, apaga a foto que saiu; desfeita, apaga a que acabou de ser
	 * enviada, para não sobrar arquivo sem loja.
	 */
	private void depoisDaTransacao(String fotoNova, String fotoQueSai) {
		TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
			@Override
			public void afterCompletion(int status) {
				if (status == STATUS_COMMITTED) {
					armazenamento.apagar(fotoQueSai);
				}
				else {
					armazenamento.apagar(fotoNova);
				}
			}
		});
	}

	private void registrar(UsuarioAutenticado usuario, Estabelecimento estabelecimento, Map<String, Object> antes) {
		auditoria.registrar(RegistroAuditoria.de(AcaoAuditoria.ESTABELECIMENTO_EDITADO)
			.estabelecimento(usuario.estabelecimentoId())
			.usuario(usuario.usuarioId())
			.entidade(ENTIDADE, estabelecimento.getId())
			.detalhes(Map.of("antes", antes, "depois", retrato(estabelecimento))));
	}

	private RespostaEstabelecimento resposta(Estabelecimento estabelecimento) {
		return RespostaEstabelecimento.de(estabelecimento, armazenamento);
	}

	private Estabelecimento encontrar(UsuarioAutenticado usuario) {
		return estabelecimentos.findById(usuario.estabelecimentoId())
			.orElseThrow(EstabelecimentoNaoEncontradoException::new);
	}

	/**
	 * A consulta antes de gravar já recusa um link repetido; a restrição do banco cobre duas
	 * gravações ao mesmo tempo com o mesmo link.
	 */
	private void gravar() {
		try {
			estabelecimentos.flush();
		}
		catch (DataIntegrityViolationException erro) {
			if (violouORestricaoDoSlug(erro)) {
				throw new LinkEmUsoException();
			}
			throw erro;
		}
	}

	private static boolean violouORestricaoDoSlug(DataIntegrityViolationException erro) {
		for (Throwable causa = erro; causa != null; causa = causa.getCause()) {
			if (causa instanceof ConstraintViolationException violacao
					&& RESTRICAO_SLUG.equalsIgnoreCase(violacao.getConstraintName())) {
				return true;
			}
		}
		return false;
	}

	/** Os campos que a Lídia edita, com os nomes da tela, para o log mostrar o antes e o depois. */
	private static Map<String, Object> retrato(Estabelecimento estabelecimento) {
		Map<String, Object> campos = new LinkedHashMap<>();
		campos.put("nome", estabelecimento.getNome());
		campos.put("slug", estabelecimento.getSlug());
		campos.put("descricao", estabelecimento.getDescricao());
		campos.put("whatsapp", estabelecimento.getTelefoneWhatsapp());
		campos.put("emailContato", estabelecimento.getEmailContato());
		campos.put("cep", estabelecimento.getCep());
		campos.put("logradouro", estabelecimento.getLogradouro());
		campos.put("numero", estabelecimento.getNumero());
		campos.put("complemento", estabelecimento.getComplemento());
		campos.put("bairro", estabelecimento.getBairro());
		campos.put("cidade", estabelecimento.getCidade());
		campos.put("uf", estabelecimento.getUf());
		// Só o caminho no bucket, como na foto do produto (ZAP-119)
		campos.put("logo", estabelecimento.getLogoCaminho());
		campos.put("capa", estabelecimento.getCapaCaminho());
		return campos;
	}

	private static OffsetDateTime agora() {
		return OffsetDateTime.now(ZoneOffset.UTC);
	}

}
