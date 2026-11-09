package br.com.zappi.estabelecimento;

import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import br.com.zappi.seguranca.UsuarioAutenticado;
import jakarta.validation.Valid;

/**
 * Estabelecimento da usuária logada (ZAP-36). Não há id na rota: o estabelecimento é o do
 * token (RN01). Todas as rotas exigem o token.
 */
@RestController
@RequestMapping("/api/estabelecimento")
public class ControladorEstabelecimento {

	private static final String FOTO = "/{foto:" + FotoDoEstabelecimento.ROTAS + "}";

	private final ServicoEstabelecimento servico;

	public ControladorEstabelecimento(ServicoEstabelecimento servico) {
		this.servico = servico;
	}

	@GetMapping
	public RespostaEstabelecimento buscar(@AuthenticationPrincipal UsuarioAutenticado usuario) {
		return servico.buscar(usuario);
	}

	@PutMapping
	public RespostaEstabelecimento editar(@AuthenticationPrincipal UsuarioAutenticado usuario,
			@Valid @RequestBody RequisicaoEstabelecimento dados) {
		return servico.editar(usuario, dados);
	}

	/**
	 * Envia ou troca o logo ({@code /logo}) ou a capa ({@code /capa}) da loja (ZAP-119), em
	 * {@code multipart/form-data} com o campo {@code arquivo}.
	 */
	@PostMapping(path = FOTO, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public RespostaEstabelecimento enviarFoto(@AuthenticationPrincipal UsuarioAutenticado usuario,
			@PathVariable String foto, @RequestPart(name = "arquivo", required = false) MultipartFile arquivo) {
		FotoDoEstabelecimento qual = FotoDoEstabelecimento.daRota(foto);
		return servico.enviarFoto(usuario, qual, ArquivoDeFoto.validar(arquivo, qual));
	}

	@DeleteMapping(FOTO)
	public RespostaEstabelecimento removerFoto(@AuthenticationPrincipal UsuarioAutenticado usuario,
			@PathVariable String foto) {
		return servico.removerFoto(usuario, FotoDoEstabelecimento.daRota(foto));
	}

}
