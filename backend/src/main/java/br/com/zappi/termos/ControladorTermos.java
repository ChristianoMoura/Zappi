package br.com.zappi.termos;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.zappi.seguranca.ConfiguracaoSeguranca;
import br.com.zappi.seguranca.UsuarioAutenticado;

/**
 * Termos de uso e Política de privacidade (ZAP-146): a versão vigente, aberta sem login para as
 * telas saberem se pedem o aceite (a rota é liberada em {@link ConfiguracaoSeguranca}), e a versão
 * que a Lídia aceitou, só para quem tem token.
 */
@RestController
public class ControladorTermos {

	/** Versão vigente e data, sem login (login, cardápio e páginas dos textos). */
	public static final String ROTA_VIGENTES = "/api/publico/termos";

	/** Último aceite da usuária logada. */
	public static final String ROTA_ACEITOS = "/api/autenticacao/termos-aceitos";

	private final ServicoTermos servico;

	public ControladorTermos(ServicoTermos servico) {
		this.servico = servico;
	}

	@GetMapping(ROTA_VIGENTES)
	public TermosVigentes vigentes() {
		return servico.vigentes();
	}

	/** 204 se não há aceite: o token foi emitido antes dos termos existirem. */
	@GetMapping(ROTA_ACEITOS)
	public ResponseEntity<TermosAceitos> aceitos(@AuthenticationPrincipal UsuarioAutenticado usuario) {
		return servico.ultimoAceite(usuario.usuarioId())
			.map(ResponseEntity::ok)
			.orElseGet(() -> ResponseEntity.noContent().build());
	}

}
