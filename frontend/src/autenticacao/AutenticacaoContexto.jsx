import { createContext, useContext, useState } from 'react'

// Ponto único que responde "a Lídia está logada?".
// PROVISÓRIO: guarda o estado só na memória e não fala com o backend.
// A ZAP-16 (login) troca isto pela autenticação com JWT.
const AutenticacaoContexto = createContext(null)

export function AutenticacaoProvider({ children }) {
  const [autenticado, setAutenticado] = useState(false)

  const valor = {
    autenticado,
    entrar: () => setAutenticado(true),
    sair: () => setAutenticado(false),
  }

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
