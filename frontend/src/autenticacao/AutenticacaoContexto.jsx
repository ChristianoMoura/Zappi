import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { entrarNoServidor } from './servicoAutenticacao'

// Ponto único que responde "a Lídia está logada?" e guarda o token do login.
// O token fica só na memória: some ao recarregar a página. Onde guardá-lo de forma
// permanente e por quanto tempo ele vale são decisões abertas da ZAP-62.
const AutenticacaoContexto = createContext(null)

export function AutenticacaoProvider({ children }) {
  const [sessao, setSessao] = useState(null)

  const entrar = useCallback(async (email, senha) => {
    const resposta = await entrarNoServidor(email, senha)
    setSessao({ token: resposta.token, nome: resposta.nome })
  }, [])

  const sair = useCallback(() => setSessao(null), [])

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
