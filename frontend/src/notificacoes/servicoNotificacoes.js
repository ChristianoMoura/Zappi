// Notificações do painel (ZAP-172, ZAP-175), pelas rotas /api/notificacoes da ZAP-174. O backend
// monta os textos na hora, a partir do pedido, sem guardar nome nem telefone do cliente (RN17).
// O token, o 401 e a falta de conexão ficam no clienteApi, o mesmo das outras telas.
//
// Formato combinado com o backend (ZAP-174):
// - GET /api/notificacoes/nao-vistas → { quantidade }. Também gera os avisos de retirada próxima
//   que já venceram, porque o backend gratuito do Render dorme e não tem tarefa agendada.
// - GET /api/notificacoes → [{ id, tipo (1 novo pedido, 2 retirada próxima), momento (nulo,
//   VESPERA, NO_DIA ou DUAS_HORAS), numeroPedido, dataRetirada, criadoEm (UTC), vista, texto }],
//   dos últimos 30 dias, mais recentes primeiro.
// - POST /api/notificacoes/vistas { ids } → 204.

import { chamarApi, ServicoIndisponivelError } from '../autenticacao/clienteApi'

export { ServicoIndisponivelError, SessaoExpiradaError } from '../autenticacao/clienteApi'

// A rota ainda não existe no backend em uso (404): o painel esconde o sino em vez de mostrar erro
export class NotificacoesIndisponiveisError extends Error {}

async function chamar(caminho, opcoes) {
  const resposta = await chamarApi(`/notificacoes${caminho}`, opcoes)
  if (resposta.status === 404) throw new NotificacoesIndisponiveisError()
  if (!resposta.ok) throw new ServicoIndisponivelError()
  return resposta.status === 204 ? null : resposta.json()
}

const paraTela = (notificacao) => ({
  id: notificacao.id,
  numeroPedido: notificacao.numeroPedido,
  texto: notificacao.texto,
  criadoEm: notificacao.criadoEm,
  vista: Boolean(notificacao.vista),
})

export async function contarNaoVistas() {
  const resposta = await chamar('/nao-vistas')
  return Number(resposta?.quantidade) || 0
}

export async function buscarNotificacoes() {
  return (await chamar('')).map(paraTela)
}

export async function marcarVistas(ids) {
  if (!ids.length) return
  await chamar('/vistas', { metodo: 'POST', json: { ids } })
}

// "agora", "há 5 min", "há 2 h", "há 1 dia", "há 3 dias"
export function haQuantoTempo(iso, agora = new Date()) {
  const minutos = Math.max(0, Math.floor((agora - new Date(iso)) / 60_000))
  if (minutos < 1) return 'agora'
  if (minutos < 60) return `há ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `há ${horas} h`
  const dias = Math.floor(horas / 24)
  return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`
}

// Número sobre o sino: some no zero e para em "9+"
export const textoContador = (quantidade) => (quantidade > 9 ? '9+' : String(quantidade))

// Nome acessível do sino, com a contagem
export const nomeDoSino = (quantidade) =>
  quantidade > 0 ? `Notificações, ${quantidade} ${quantidade === 1 ? 'não vista' : 'não vistas'}` : 'Notificações'
