package br.com.zappi.produto;

import java.net.URI;
import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import br.com.zappi.seguranca.UsuarioAutenticado;
import jakarta.validation.Valid;

/** Produtos do cardápio da usuária logada (ZAP-39). Todas as rotas exigem o token. */
@RestController
@RequestMapping("/api/produtos")
public class ControladorProduto {

	private final ServicoProduto servico;

	public ControladorProduto(ServicoProduto servico) {
		this.servico = servico;
	}

	@GetMapping
	public List<RespostaProduto> listar(@AuthenticationPrincipal UsuarioAutenticado usuario) {
		return servico.listar(usuario);
	}

	@GetMapping("/{id}")
	public RespostaProduto buscar(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Long id) {
		return servico.buscar(usuario, id);
	}

	@PostMapping
	public ResponseEntity<RespostaProduto> criar(@AuthenticationPrincipal UsuarioAutenticado usuario,
			@Valid @RequestBody RequisicaoProduto dados) {
		RespostaProduto criado = servico.criar(usuario, dados);
		return ResponseEntity.created(URI.create("/api/produtos/" + criado.id())).body(criado);
	}

	@PutMapping("/{id}")
	public RespostaProduto editar(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Long id,
			@Valid @RequestBody RequisicaoProduto dados) {
		return servico.editar(usuario, id, dados);
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<Void> excluir(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Long id) {
		servico.excluir(usuario, id);
		return ResponseEntity.noContent().build();
	}

	/**
	 * Envia ou troca a foto (ZAP-40), em {@code multipart/form-data} com os campos
	 * {@code arquivo} e {@code textoAlternativo}.
	 */
	@PostMapping(path = "/{id}/foto", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public RespostaProduto enviarFoto(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Long id,
			@RequestPart(name = "arquivo", required = false) MultipartFile arquivo,
			@RequestParam(name = "textoAlternativo", required = false) String textoAlternativo) {
		return servico.enviarFoto(usuario, id, FotoRecebida.validar(arquivo, textoAlternativo));
	}

	@DeleteMapping("/{id}/foto")
	public RespostaProduto removerFoto(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Long id) {
		return servico.removerFoto(usuario, id);
	}

}
