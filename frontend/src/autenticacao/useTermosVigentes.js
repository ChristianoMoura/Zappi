import { useEffect, useState } from 'react'
import { buscarTermosVigentes } from './servicoTermos'

// Versão vigente dos termos ({ versao, data }), ou nulo enquanto carrega ou se o backend ainda
// não tem a rota (ZAP-146): aí a tela não mostra a caixa de aceite nem os links (ZAP-147)
export function useTermosVigentes() {
  const [termos, setTermos] = useState(null)
  useEffect(() => {
    let ativo = true
    buscarTermosVigentes().then((vigentes) => {
      if (ativo) setTermos(vigentes)
    })
    return () => {
      ativo = false
    }
  }, [])
  return termos
}
