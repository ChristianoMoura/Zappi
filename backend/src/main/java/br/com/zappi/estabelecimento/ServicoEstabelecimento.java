package br.com.zappi.estabelecimento;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;

import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

	public ServicoEstabelecimento(EstabelecimentoRepositorio estabelecimentos, ServicoAuditoria auditoria) {
		this.estabelecimentos = estabelecimentos;
		this.auditoria = auditoria;
	}

	@Transactional(readOnly = true)
	public RespostaEstabelecimento buscar(UsuarioAutenticado usuario) {
		return RespostaEstabelecimento.de(encontrar(usuario));
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

		auditoria.registrar(RegistroAuditoria.de(AcaoAuditoria.ESTABELECIMENTO_EDITADO)
			.estabelecimento(usuario.estabelecimentoId())
			.usuario(usuario.usuarioId())
			.entidade(ENTIDADE, estabelecimento.getId())
			.detalhes(Map.of("antes", antes, "depois", retrato(estabelecimento))));
		return RespostaEstabelecimento.de(estabelecimento);
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
		return campos;
	}

	private static OffsetDateTime agora() {
		return OffsetDateTime.now(ZoneOffset.UTC);
	}

}
