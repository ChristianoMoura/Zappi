package br.com.zappi.seguranca;

import java.time.Duration;
import java.util.List;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Regras de acesso da API (ISO 27002 5.15).
 *
 * Só a verificação de saúde é aberta; todo o resto exige login. O login com JWT
 * entra na ZAP-31 e a proteção das rotas /api na ZAP-32.
 */
@Configuration
@EnableConfigurationProperties(PropriedadesCors.class)
public class ConfiguracaoSeguranca {

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
				.anyRequest().authenticated())
			// Sem login, responde 401 em vez do 403 padrão.
			.exceptionHandling(erros -> erros
				.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)));
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
