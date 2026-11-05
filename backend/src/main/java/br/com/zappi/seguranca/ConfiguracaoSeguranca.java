package br.com.zappi.seguranca;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;

/**
 * Regras de acesso da API (ISO 27002 5.15).
 *
 * Só a verificação de saúde é aberta; todo o resto exige login. O login com JWT
 * entra na ZAP-31 e a proteção das rotas /api na ZAP-32.
 */
@Configuration
public class ConfiguracaoSeguranca {

	@Bean
	SecurityFilterChain filtroDeSeguranca(HttpSecurity http) throws Exception {
		http
			// API REST com token: sem sessão, sem cookie e, por isso, sem CSRF.
			.csrf(AbstractHttpConfigurer::disable)
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

}
