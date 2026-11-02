import { useEffect } from 'react'

// Título da aba do navegador, lido pelo leitor de tela ao trocar de página
export function useTituloPagina(titulo) {
  useEffect(() => {
    document.title = `${titulo} · Zappi`
  }, [titulo])
}
