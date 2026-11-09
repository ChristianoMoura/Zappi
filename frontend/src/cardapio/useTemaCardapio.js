import { useCallback, useState } from 'react'

// Tema do cardápio público (ZAP-100): começa pela preferência do aparelho e guarda a escolha do
// cliente só neste navegador, sem dado pessoal
const CHAVE = 'zappi.cardapio.tema'

function temaInicial() {
  try {
    const guardado = localStorage.getItem(CHAVE)
    if (guardado === 'escuro' || guardado === 'claro') return guardado === 'escuro'
  } catch {
    // Sem armazenamento: segue a preferência do aparelho
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export function useTemaCardapio() {
  const [escuro, setEscuro] = useState(temaInicial)

  const alternar = useCallback(() => {
    setEscuro((atual) => {
      const novo = !atual
      try {
        localStorage.setItem(CHAVE, novo ? 'escuro' : 'claro')
      } catch {
        // Sem armazenamento: o tema vale até fechar a página
      }
      return novo
    })
  }, [])

  return [escuro, alternar]
}
