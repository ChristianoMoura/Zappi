// Chamada de login ao backend (ZAP-31): POST /api/autenticacao/login.
// Em produção, o Render repassa /api ao backend; em desenvolvimento, o proxy do Vite
// (vite.config.js) faz o mesmo para o backend local.

export class CredenciaisInvalidasError extends Error {}
export class LoginBloqueadoError extends Error {}
export class ServicoIndisponivelError extends Error {}
// E-mail e senha certos, mas falta aceitar a versão vigente dos termos (ZAP-146, ZAP-147)
export class TermosPendentesError extends Error {}

// Bloqueio depois de 5 falhas seguidas (RF02), que chega na ZAP-85.
const CODIGO_LOGIN_BLOQUEADO = 'LOGIN_BLOQUEADO'
const CODIGO_TERMOS_PENDENTES = 'TERMOS_PENDENTES'

// `aceite` ({ versao }) vai junto quando a Lídia marcou a caixa dos termos: o backend grava o
// aceite com a versão, a data, o IP e o navegador (ZAP-146)
export async function entrarNoServidor(email, senha, aceite = null) {
  const corpo = aceite ? { email, senha, aceiteTermos: true, versaoTermos: aceite.versao } : { email, senha }
  let resposta
  try {
    resposta = await fetch('/api/autenticacao/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    })
  } catch {
    // Sem conexão ou servidor fora do ar
    throw new ServicoIndisponivelError()
  }

  if (resposta.ok) {
    const dados = await lerJson(resposta)
    if (!dados?.token) throw new ServicoIndisponivelError()
    return { token: dados.token, nome: dados.nome }
  }

  const erro = await lerJson(resposta)
  // Só vem com a senha certa, para não revelar se o e-mail existe (ZAP-146)
  if (erro?.codigo === CODIGO_TERMOS_PENDENTES) throw new TermosPendentesError()
  if (resposta.status === 429 || erro?.codigo === CODIGO_LOGIN_BLOQUEADO) {
    throw new LoginBloqueadoError()
  }
  // 401: e-mail ou senha incorretos (sempre a mesma resposta, sem revelar qual).
  // 400: dados que a tela deixou passar, como um e-mail mal formado.
  if (resposta.status === 401 || resposta.status === 400) {
    throw new CredenciaisInvalidasError()
  }
  throw new ServicoIndisponivelError()
}

async function lerJson(resposta) {
  try {
    return await resposta.json()
  } catch {
    return null
  }
}
