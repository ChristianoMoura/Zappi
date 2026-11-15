import { useCallback, useEffect, useRef, useState } from 'react'
import { contarNaoVistas, NotificacoesIndisponiveisError } from './servicoNotificacoes'

// Uma consulta por minuto (ZAP-172)
export const INTERVALO_NOTIFICACOES = 60_000

// Contador do sino (ZAP-175): consulta as não vistas ao abrir o painel e a cada minuto, só com a
// aba visível; ao voltar para a aba, consulta na hora. `aviso` é o texto para o leitor de tela
// quando a contagem aumenta (não no primeiro carregamento). Sem a rota no backend (404),
// `disponivel` fica falso e o painel esconde o sino.
export function useNotificacoes() {
  const [quantidade, setQuantidade] = useState(0)
  const [disponivel, setDisponivel] = useState(true)
  const [aviso, setAviso] = useState('')
  const anterior = useRef(null)

  const atualizar = useCallback(async () => {
    try {
      const nova = await contarNaoVistas()
      if (anterior.current !== null && nova > anterior.current) {
        const chegaram = nova - anterior.current
        setAviso(chegaram === 1 ? '1 notificação nova' : `${chegaram} notificações novas`)
      }
      anterior.current = nova
      setQuantidade(nova)
    } catch (erro) {
      // Sem conexão, o contador fica como estava e tenta de novo no próximo minuto
      if (erro instanceof NotificacoesIndisponiveisError) setDisponivel(false)
    }
  }, [])

  useEffect(() => {
    if (!disponivel) return undefined
    let intervalo = null
    const parar = () => {
      clearInterval(intervalo)
      intervalo = null
    }
    const comecar = () => {
      parar()
      atualizar()
      intervalo = setInterval(atualizar, INTERVALO_NOTIFICACOES)
    }
    const aoMudarVisibilidade = () => (document.visibilityState === 'visible' ? comecar() : parar())

    if (document.visibilityState === 'visible') comecar()
    document.addEventListener('visibilitychange', aoMudarVisibilidade)
    return () => {
      parar()
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
    }
  }, [atualizar, disponivel])

  // Ao abrir a caixinha, as notificações viram vistas e o contador zera
  const zerar = useCallback(() => {
    anterior.current = 0
    setQuantidade(0)
  }, [])

  return { quantidade, disponivel, aviso, zerar }
}
