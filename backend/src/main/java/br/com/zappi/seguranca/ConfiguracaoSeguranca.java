package br.com.zappi.seguranca;

import java.time.Duration;
import java.util.List;

import jakarta.servlet.DispatcherType;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Regras de acesso da API (RN02, ISO 27002 5.15).
 *
 * Abertos: a verificação de saúde e o login (ZAP-31). Todo o resto exige um token JWT
 * válido no header {@code Authorization: Bearer} (ZAP-32). As rotas públicas do Portal
 * do Cliente são liberadas aqui pelas tarefas delas.
 */
@Configuration
@EnableConfigurationProperties(PropriedadesCors.class)
public class ConfiguracaoSeguranca {

	/** Rota de login (ZAP-31), a única da API aberta sem token. */
	public static final String ROTA_LOGIN = "/api/autenticacao/login";

	@Bean
	SecurityFilterChain filtroDeSeguranca(HttpSecurity http, CorsConfigurationSource fonteDeCors) throws Exception {
		http
			// API REST com token: sem sessão, sem cookie e, por isso, sem CSRF.
			.csrf(AbstractHttpConfigurer::disable)
			.cors(cors -> cors.configurationSource(fonteDeCors))
			.sessionManagement(sessao -> sessao.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.httpBasic(AbstractHttpConfigurer::disable)
			.formLogin(AbstractHttpConfigurer::disable)
			.authorizeHttpRequests(rotas -> rotas
				.requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
				.requestMatchers(HttpMethod.POST, ROTA_LOGIN).permitAll()
				// Erros (ex.: 404) mostram o status certo em vez de 401. Uma rota protegida
				// sem token é barrada antes de chegar aqui.
				.dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
				.anyRequest().authenticated())
			// Valida o token (assinatura, validade e emissor) e transforma em UsuarioAutenticado.
			.oauth2ResourceServer(recurso -> recurso
				.jwt(jwt -> jwt.jwtAuthenticationConverter(ConfiguracaoJwt::autenticacao)))
			// Sem token ou com token inválido/expirado: 401, e o front volta para o login.
			.exceptionHandling(erros -> erros
				.authenticationEntryPoint(new BearerTokenAuthenticationEntryPoint()));
		return http.build();
	}

	/**
	 * No Render, o frontend (Static Site) e a API (Web Service) ficam em endereços
	 * diferentes: só as origens de {@code CORS_ORIGENS} podem chamar a API. O token vai no
	 * header Authorization, então não há cookies entre sites.
	 */
	@Bean
	CorsConfigurationSource fonteDeCors(PropriedadesCors propriedades) {
		CorsConfiguration configuracao = new CorsConfiguration();
		configuracao.setAllowedOrigins(propriedades.origensPermitidas());
		configuracao.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
		configuracao.setAllowedHeaders(List.of("Authorization", "Content-Type"));
		configuracao.setMaxAge(Duration.ofHours(1));

		UrlBasedCorsConfigurationSource fonte = new UrlBasedCorsConfigurationSource();
		fonte.registerCorsConfiguration("/api/**", configuracao);
		return fonte;
	}

}
