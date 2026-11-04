// Chamada de login ao backend.
// PENDENTE: o endpoint de login é a ZAP-31, que ainda não existe. Enquanto isso,
// no modo de desenvolvimento a resposta é simulada com um acesso fictício,
// e fora dele o login avisa que ainda não está disponível.
// Quando a ZAP-31 ficar pronta, só esta função muda.

export class CredenciaisInvalidasError extends Error {}
export class LoginBloqueadoError extends Error {}
export class ServicoIndisponivelError extends Error {}

// Acesso fictício, só para testar a tela em desenvolvimento (não é a senha da Lídia)
const ACESSO_DE_TESTE = { email: 'lidia@casabelt.com', senha: 'Bolo@2026' }

// Simula o bloqueio do RF02 (5 falhas seguidas por e-mail), que será feito pelo backend
// na ZAP-85. A contagem fica na memória: recarregar a página libera o login.
const MAXIMO_DE_FALHAS = 5
const falhasPorEmail = new Map()

export async function entrarNoServidor(email, senha) {
  if (!import.meta.env.DEV) {
    throw new ServicoIndisponivelError()
  }

  await new Promise((resolver) => setTimeout(resolver, 700))
  const emailNormalizado = email.toLowerCase()
  const falhas = falhasPorEmail.get(emailNormalizado) ?? 0
  if (falhas >= MAXIMO_DE_FALHAS) {
    throw new LoginBloqueadoError()
  }
  if (emailNormalizado === ACESSO_DE_TESTE.email && senha === ACESSO_DE_TESTE.senha) {
    falhasPorEmail.delete(emailNormalizado)
    return { token: 'token-simulado-de-desenvolvimento', nome: 'Lídia' }
  }
  falhasPorEmail.set(emailNormalizado, falhas + 1)
  throw new CredenciaisInvalidasError()
}
