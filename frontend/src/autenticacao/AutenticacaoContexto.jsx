import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { entrarNoServidor } from './servicoAutenticacao'

// Ponto único que responde "a Lídia está logada?" e guarda o token do login.
// O token fica no sessionStorage (decisão da ZAP-62): continua ao recarregar a página
// e some ao fechar a aba. Ele vale 8 horas; vencido, o servidor recusa e o useApi
// volta para o login.
const AutenticacaoContexto = createContext(null)

const CHAVE_SESSAO = 'zappi.sessao'

function lerSessaoSalva() {
  try {
    const sessao = JSON.parse(sessionStorage.getItem(CHAVE_SESSAO))
    return sessao?.token ? sessao : null
  } catch {
    return null
  }
}

function salvarSessao(sessao) {
  try {
    if (sessao) sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao))
    else sessionStorage.removeItem(CHAVE_SESSAO)
  } catch {
    // Navegador sem armazenamento: a sessão fica só na memória até recarregar a página
  }
}

export function AutenticacaoProvider({ children }) {
  const [sessao, setSessao] = useState(lerSessaoSalva)

  const entrar = useCallback(async (email, senha) => {
    const resposta = await entrarNoServidor(email, senha)
    const novaSessao = { token: resposta.token, nome: resposta.nome }
    salvarSessao(novaSessao)
    setSessao(novaSessao)
  }, [])

  const sair = useCallback(() => {
    salvarSessao(null)
    setSessao(null)
  }, [])

  const valor = useMemo(
    () => ({ autenticado: sessao !== null, token: sessao?.token ?? null, nome: sessao?.nome ?? null, entrar, sair }),
    [sessao, entrar, sair],
  )

  return <AutenticacaoContexto value={valor}>{children}</AutenticacaoContexto>
}

// eslint-disable-next-line react/only-export-components
export function useAutenticacao() {
  const contexto = useContext(AutenticacaoContexto)
  if (!contexto) {
    throw new Error('useAutenticacao precisa estar dentro de AutenticacaoProvider')
  }
  return contexto
}
