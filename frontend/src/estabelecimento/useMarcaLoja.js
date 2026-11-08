import { useEffect, useState } from 'react'
import { buscarMarcaLoja, ouvirEstabelecimento } from './servicoEstabelecimento'

// Nome e logo da loja para o topo do painel e o login (collab Casa Belt × Zappi).
// Fica igual ao Meu estabelecimento e muda assim que ele é salvo. Sem dados, devolve null
// e as telas mostram só a marca do Zappi.
export function useMarcaLoja() {
  const [marca, setMarca] = useState(null)

  useEffect(() => {
    let ativo = true
    buscarMarcaLoja()
      .then((resposta) => {
        if (ativo) setMarca(resposta)
      })
      .catch(() => {
        if (ativo) setMarca(null)
      })
    const parar = ouvirEstabelecimento((nova) => setMarca(nova))
    return () => {
      ativo = false
      parar()
    }
  }, [])

  return marca
}

export const iniciaisDaLoja = (nome) => (String(nome ?? '').trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2) || 'Z').toUpperCase()
