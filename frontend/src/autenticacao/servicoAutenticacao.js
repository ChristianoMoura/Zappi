// Chamada de login ao backend (ZAP-31): POST /api/autenticacao/login.
// Em produção, o Render repassa /api ao backend; em desenvolvimento, o proxy do Vite
// (vite.config.js) faz o mesmo para o backend local.

export class CredenciaisInvalidasError extends Error {}
export class LoginBloqueadoError extends Error {}
export class ServicoIndisponivelError extends Error {}

// Bloqueio depois de 5 falhas seguidas (RF02), que chega na ZAP-85.
const CODIGO_LOGIN_BLOQUEADO = 'LOGIN_BLOQUEADO'

export async function entrarNoServidor(email, senha) {
  let resposta
  try {
    resposta = await fetch('/api/autenticacao/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
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
