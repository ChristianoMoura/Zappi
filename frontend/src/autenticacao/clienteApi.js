// Chamadas às rotas /api com o token do login, usadas pelos serviços das telas (produtos,
// estabelecimento). Em produção, o Render repassa /api ao backend; em desenvolvimento, o proxy
// do Vite faz o mesmo (vite.config.js). Cada serviço decide o que fazer com os demais status
// (404, 409, 400...), e os erros abaixo são os mesmos para todos.

export class ServicoIndisponivelError extends Error {}
export class SessaoExpiradaError extends Error {}

// A mesma chave do AutenticacaoContexto, onde fica o token do login (ZAP-62)
const CHAVE_SESSAO = 'zappi.sessao'

export function lerToken() {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE_SESSAO))?.token ?? null
  } catch {
    return null
  }
}

// Token vencido ou inválido: encerra a sessão e volta para o login, como o useApi faz
function encerrarSessao() {
  try {
    sessionStorage.removeItem(CHAVE_SESSAO)
  } catch {
    // Sem armazenamento: não há sessão guardada para apagar
  }
  window.location.assign('/login')
}

// Chama /api + `caminho` com o token, em JSON (`json`) ou multipart (`formulario`), e devolve a
// resposta. Sem conexão vira ServicoIndisponivelError; o 401 encerra a sessão e vira
// SessaoExpiradaError.
export async function chamarApi(caminho, { metodo = 'GET', json, formulario } = {}) {
  const headers = {}
  const token = lerToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let body
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(json)
  } else if (formulario) {
    body = formulario
  }

  let resposta
  try {
    resposta = await fetch(`/api${caminho}`, { method: metodo, headers, body })
  } catch {
    // Sem conexão ou servidor fora do ar
    throw new ServicoIndisponivelError()
  }
  if (resposta.status === 401) {
    encerrarSessao()
    throw new SessaoExpiradaError()
  }
  return resposta
}

// Corpo da resposta em JSON, ou nulo se vier vazio ou com defeito
export async function lerJson(resposta) {
  try {
    return await resposta.json()
  } catch {
    return null
  }
}

// A foto escolhida na tela é um endereço temporário (blob:); devolve o arquivo para o envio
export async function lerArquivoTemporario(endereco) {
  try {
    return await (await fetch(endereco)).blob()
  } catch {
    throw new ServicoIndisponivelError()
  }
}
