// Leitura dos pedidos do estabelecimento da usuária logada e as ações sobre eles, pelas rotas
// /api/pedidos (ZAP-44, ZAP-45, ZAP-49, ZAP-50, ZAP-53, ZAP-75, ZAP-76, ZAP-88 e ZAP-90). Em
// produção, o Render repassa /api ao backend; em desenvolvimento, o proxy do Vite faz o mesmo
// (vite.config.js). As telas continuam usando as mesmas funções, campos e erros de antes: aqui
// os tipos, status e datas da API viram os da tela (ZAP-122). O token, o 401 e a falta de conexão
// ficam no clienteApi, o mesmo dos produtos.

import { chamarApi, lerJson, ServicoIndisponivelError } from '../autenticacao/clienteApi'
import { dataLocal, STATUS } from './regrasPedidos'

export { ServicoIndisponivelError, SessaoExpiradaError } from '../autenticacao/clienteApi'
export class AcaoNaoPermitidaError extends Error {}

// Nomes da tela para o tipo e o status da mensagem (RN07)
const TIPOS = { CONFIRMACAO: 'Confirmação', RECUSA: 'Recusa', PRONTO: 'Pronto para retirada' }
const STATUS_MENSAGEM = { PENDENTE: 'Pendente', ENVIADA: 'Enviada', FALHA: 'Falha' }

// Rotas de avançar e voltar uma coluna, pelo status atual (RN03, ZAP-64)
const ROTA_AVANCO = { [STATUS.CONFIRMADO]: 'iniciar-producao', [STATUS.EM_PRODUCAO]: 'concluir' }
const ROTA_VOLTA = { [STATUS.EM_PRODUCAO]: 'voltar-para-confirmado', [STATUS.CONCLUIDO]: 'voltar-para-producao' }

async function chamar(caminho, opcoes) {
  const resposta = await chamarApi(`/pedidos${caminho}`, opcoes)
  // Inexistente ou de outro estabelecimento (404), fora da etapa certa (409) ou dados que o
  // backend recusou (400): a tela mostra que não deu para fazer a ação. O 409 traz o motivo.
  if ([400, 404, 409].includes(resposta.status)) {
    const corpo = resposta.status === 409 ? await lerJson(resposta) : null
    throw new AcaoNaoPermitidaError(corpo?.mensagem)
  }
  if (!resposta.ok) throw new ServicoIndisponivelError()
  return resposta.json()
}

// Data e hora da API (UTC) no formato da tela, no fuso de quem usa o painel: AAAA-MM-DDTHH:MM
function dataHoraLocal(iso) {
  if (!iso) return undefined
  const data = new Date(iso)
  return `${dataLocal(data)}T${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`
}

// A tela trata campo ausente como vazio; a API manda nulo
const opcional = (valor) => valor ?? undefined

function itemParaTela(item) {
  return {
    produtoId: item.produtoId,
    produto: item.produto,
    sabor: item.sabor,
    unidade: item.unidade,
    quantidade: item.quantidade,
    precoUnitario: item.precoUnitario,
    recheio: opcional(item.recheio),
    cobertura: opcional(item.cobertura),
    observacao: opcional(item.observacao),
  }
}

function mensagemParaTela(mensagem) {
  return {
    id: mensagem.id,
    tipo: TIPOS[mensagem.tipo] ?? mensagem.tipo,
    status: STATUS_MENSAGEM[mensagem.status] ?? mensagem.status,
    texto: mensagem.texto,
    link: opcional(mensagem.link),
    enviadoEm: dataHoraLocal(mensagem.enviadoEm),
  }
}

function paraTela(pedido) {
  return {
    numero: pedido.numero,
    status: pedido.status,
    // AAAA-MM-DDTHH:MM, no horário de São Paulo, sem os segundos (ZAP-127)
    dataRetirada: pedido.dataRetirada.slice(0, 16),
    observacao: opcional(pedido.observacao),
    // Cliente anonimizado (RN17) vem sem telefone
    cliente: { nome: pedido.cliente.nome, telefone: pedido.cliente.telefone ?? '', anonimizado: pedido.cliente.anonimizado },
    itens: pedido.itens.map(itemParaTela),
    criadoEm: dataHoraLocal(pedido.criadoEm),
    confirmadoEm: dataHoraLocal(pedido.confirmadoEm),
    producaoEm: dataHoraLocal(pedido.producaoEm),
    concluidoEm: dataHoraLocal(pedido.concluidoEm),
    recusadoEm: dataHoraLocal(pedido.recusadoEm),
    motivoRecusa: opcional(pedido.motivoRecusa),
    cancelado: pedido.cancelado,
    mensagens: (pedido.mensagens ?? []).map(mensagemParaTela),
  }
}

const pedidoDaApi = async (caminho, opcoes) => paraTela(await chamar(caminho, opcoes))

// Todos, com os recusados: o filtro "Mostrar recusados" é da tela (RN04)
export async function buscarPedidos() {
  return (await chamar('?recusados=true')).map(paraTela)
}

export const buscarPedido = (numero) => pedidoDaApi(`/${numero}`)

// Cadastro de pedido pela Lídia (ZAP-88, RF13). O backend dá o número (RN09), usa o preço do
// cardápio (RN10), calcula o total (RN11) e só grava com o consentimento do cliente (RN16).
export const cadastrarPedido = (dados) => pedidoDaApi('', { metodo: 'POST', json: dados })

// Edição conforme o status (ZAP-90, RF14, RN21). Os itens que continuam mantêm o preço da
// época, e a confirmação é atualizada no pedido Confirmado.
export const editarPedido = (numero, dados) => pedidoDaApi(`/${numero}`, { metodo: 'PUT', json: dados })

// Novo → Confirmado, com a mensagem de confirmação pendente (ZAP-49)
export const confirmarPedido = (numero) => pedidoDaApi(`/${numero}/confirmar`, { metodo: 'POST' })

// Recusa um Novo ou cancela um Confirmado ou Em produção, com o motivo (ZAP-53)
export const recusarPedido = (numero, motivo) =>
  pedidoDaApi(`/${numero}/recusar`, { metodo: 'POST', json: { motivo: motivo.trim() } })

// Apaga o nome e o WhatsApp do cliente do pedido, a pedido do titular (ZAP-116, RN17, LGPD).
// Com pedido do cliente em aberto, o 409 explica o motivo.
export const anonimizarCliente = (numero) => pedidoDaApi(`/${numero}/anonimizar-cliente`, { metodo: 'POST' })

// A rota depende de onde o pedido está agora, então ele é lido antes
async function moverPedido(numero, rotas) {
  const rota = rotas[(await buscarPedido(numero)).status]
  if (!rota) throw new AcaoNaoPermitidaError()
  return pedidoDaApi(`/${numero}/${rota}`, { metodo: 'POST' })
}

// Confirmado → Em produção e Em produção → Concluído, com o aviso de pronto (ZAP-75, ZAP-76)
export const avancarPedido = (numero) => moverPedido(numero, ROTA_AVANCO)

// Em produção → Confirmado e Concluído → Em produção (ZAP-75, decisão da ZAP-64)
export const voltarPedido = (numero) => moverPedido(numero, ROTA_VOLTA)

// O clique em "Enviar no WhatsApp" marca a mensagem como enviada; reenviar mantém a primeira
// data (ZAP-50). A tela indica a mensagem pela posição na lista do pedido.
export async function marcarMensagemEnviada(numero, indice) {
  const alvo = (await buscarPedido(numero)).mensagens[indice]
  if (!alvo) throw new AcaoNaoPermitidaError()
  return pedidoDaApi(`/${numero}/mensagens/${alvo.id}/enviada`, { metodo: 'POST' })
}
