package br.com.zappi.cliente;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** Remoção do nome e do telefone dos textos gravados ao anonimizar (ZAP-115, RN17). */
class RemocaoDeDadosPessoaisTests {

	private final RemocaoDeDadosPessoais remocao = new RemocaoDeDadosPessoais(" Ana  Exemplo ", "5511900000001",
			"0000000000007");

	@Test
	void tiraOPrimeiroNomeSoComoPalavraInteiraNaMensagem() {
		assertThat(remocao.daMensagem("Olá, Ana!\n\nBolo de banana para a ANA e a Anabela."))
			.isEqualTo("Olá, Cliente anonimizado!\n\nBolo de banana para a Cliente anonimizado e a Anabela.");
	}

	@Test
	void tiraONomeCompletoEOTelefone() {
		assertThat(remocao.daMensagem("ana exemplo ligou do 5511900000001"))
			.isEqualTo("Cliente anonimizado ligou do 0000000000007");
	}

	@Test
	void noLogTiraSoONomeCompletoEOTelefone() {
		assertThat(remocao.doLog("Ana Exemplo, 5511900000001, sabor Ana"))
			.isEqualTo("Cliente anonimizado, 0000000000007, sabor Ana");
		assertThat(remocao.doLog(null)).isNull();
	}

	@Test
	void textoComCaracteresEspeciaisNoNomeNaoQuebra() {
		RemocaoDeDadosPessoais comParenteses = new RemocaoDeDadosPessoais("Zé (Tio) $1", "5511900000002",
				"0000000000008");
		assertThat(comParenteses.daMensagem("Olá, Zé! Zé (Tio) $1")).isEqualTo(
				"Olá, Cliente anonimizado! Cliente anonimizado");
	}

	@Test
	void telefoneAnonimizadoTemTrezeDigitosComecandoPorZero() {
		assertThat(Cliente.telefoneAnonimizado(7L)).isEqualTo("0000000000007");
		assertThat(Cliente.telefoneAnonimizado(123456L)).isEqualTo("0000000123456");
	}

}
