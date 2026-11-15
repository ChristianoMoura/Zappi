package br.com.zappi.categoria;

import java.net.URI;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.zappi.seguranca.UsuarioAutenticado;
import jakarta.validation.Valid;

/**
 * Categorias do cardápio da usuária logada (ZAP-138), no contrato usado pela tela da ZAP-139.
 * Todas as rotas exigem o token.
 */
@RestController
@RequestMapping("/api/categorias")
public class ControladorCategoria {

	private final ServicoCategoria servico;

	public ControladorCategoria(ServicoCategoria servico) {
		this.servico = servico;
	}

	@GetMapping
	public List<RespostaCategoria> listar(@AuthenticationPrincipal UsuarioAutenticado usuario) {
		return servico.listar(usuario);
	}

	@PostMapping
	public ResponseEntity<RespostaCategoria> criar(@AuthenticationPrincipal UsuarioAutenticado usuario,
			@Valid @RequestBody RequisicaoCategoria dados) {
		RespostaCategoria criada = servico.criar(usuario, dados);
		return ResponseEntity.created(URI.create("/api/categorias/" + criada.id())).body(criada);
	}

	/** A ordem nova, com todos os ids, do primeiro ao último: {@code { "ids": [3, 1, 2] }}. */
	@PutMapping("/ordem")
	public List<RespostaCategoria> reordenar(@AuthenticationPrincipal UsuarioAutenticado usuario,
			@Valid @RequestBody RequisicaoOrdemCategorias dados) {
		return servico.reordenar(usuario, dados);
	}

	@PutMapping("/{id}")
	public RespostaCategoria renomear(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Long id,
			@Valid @RequestBody RequisicaoCategoria dados) {
		return servico.renomear(usuario, id, dados);
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<Void> excluir(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Long id) {
		servico.excluir(usuario, id);
		return ResponseEntity.noContent().build();
	}

}
