import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useAutenticacao } from './AutenticacaoContexto'

// Requisições às rotas /api já com o token do login.
// Se o servidor recusar o token (401), encerra a sessão e volta para o login,
// guardando a página em que a pessoa estava (ZAP-34, ISO 27002 5.15).
export function useApi() {
  const { token, sair } = useAutenticacao()
  const navegar = useNavigate()

  return useCallback(
    async (caminho, opcoes = {}) => {
      const resposta = await fetch(`/api${caminho}`, {
        ...opcoes,
        headers: {
          'Content-Type': 'application/json',
          ...opcoes.headers,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (resposta.status === 401) {
        sair()
        navegar('/login', { replace: true, state: { voltarPara: window.location.pathname, sessaoExpirada: true } })
      }
      return resposta
    },
    [token, sair, navegar],
  )
}
