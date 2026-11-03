// Chamada de login ao backend.
// PENDENTE: o endpoint de login é a ZAP-31, que ainda não existe. Enquanto isso,
// no modo de desenvolvimento a resposta é simulada com um acesso fictício,
// e fora dele o login avisa que ainda não está disponível.
// Quando a ZAP-31 ficar pronta, só esta função muda.

export class CredenciaisInvalidasError extends Error {}
export class ServicoIndisponivelError extends Error {}

// Acesso fictício, só para testar a tela em desenvolvimento (não é a senha da Lídia)
const ACESSO_DE_TESTE = { email: 'lidia@casabelt.com', senha: 'Bolo@2026' }

export async function entrarNoServidor(email, senha) {
  if (!import.meta.env.DEV) {
    throw new ServicoIndisponivelError()
  }

  await new Promise((resolver) => setTimeout(resolver, 700))
  if (email.toLowerCase() === ACESSO_DE_TESTE.email && senha === ACESSO_DE_TESTE.senha) {
    return { token: 'token-simulado-de-desenvolvimento', nome: 'Lídia' }
  }
  throw new CredenciaisInvalidasError()
}
