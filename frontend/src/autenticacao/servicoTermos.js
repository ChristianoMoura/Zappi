// Termos de uso e política de privacidade (ZAP-143, ZAP-147). A versão vigente vem de uma rota
// pública do backend (ZAP-146), sem login, no formato:
//
//   GET /api/publico/termos → 200 { "versao": 1, "data": "2026-11-14" }
//
// Enquanto a rota não existir (404) ou não responder, a função devolve nulo e as telas escondem a
// caixa de aceite e os links, como no sino de notificações: a produção não mostra erro.
//
// O navegador guarda só um lembrete da versão aceita (localStorage), para a caixa não aparecer em
// todo login no mesmo aparelho. A prova do aceite fica no servidor (ZAP-146): sem o lembrete, o
// backend responde TERMOS_PENDENTES e a caixa volta.

const CHAVE_LEMBRETE = 'zappi.termos-aceitos'

let consulta = null

// A versão não muda durante o uso; uma consulta só serve o login e o menu da conta
export function buscarTermosVigentes() {
  consulta ??= fetch('/api/publico/termos')
    .then(async (resposta) => {
      if (!resposta.ok) return null
      const dados = await resposta.json()
      return Number.isInteger(dados?.versao) ? { versao: dados.versao, data: dados.data ?? null } : null
    })
    .catch(() => null)
  return consulta
}

// Para os testes: cada um começa sem a consulta guardada
export function esquecerTermosVigentes() {
  consulta = null
}

export function lerVersaoAceita() {
  try {
    const guardada = Number(localStorage.getItem(CHAVE_LEMBRETE))
    return Number.isInteger(guardada) && guardada > 0 ? guardada : null
  } catch {
    // Sem armazenamento: a caixa aparece em todo login, e o aceite segue gravado no servidor
    return null
  }
}

export function guardarVersaoAceita(versao) {
  try {
    localStorage.setItem(CHAVE_LEMBRETE, String(versao))
  } catch {
    // Sem armazenamento: só não fica o lembrete neste aparelho
  }
}
