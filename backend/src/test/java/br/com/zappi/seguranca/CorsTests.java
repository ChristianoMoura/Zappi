package br.com.zappi.seguranca;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

import br.com.zappi.TestcontainersConfiguration;

@SpringBootTest(properties = "zappi.cors.origens-permitidas=https://painel.zappi.test")
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class CorsTests {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void liberaAOrigemDoFrontend() throws Exception {
		mockMvc.perform(options("/api/pedidos")
				.header(HttpHeaders.ORIGIN, "https://painel.zappi.test")
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET")
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Authorization"))
			.andExpect(status().isOk())
			.andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "https://painel.zappi.test"));
	}

	@Test
	void recusaOutraOrigem() throws Exception {
		mockMvc.perform(options("/api/pedidos")
				.header(HttpHeaders.ORIGIN, "https://site-qualquer.example")
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
			.andExpect(status().isForbidden())
			.andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
	}

}
