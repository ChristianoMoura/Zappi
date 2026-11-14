import { useCallback, useEffect, useState } from 'react'
import { LIMITES } from './regrasPedidoCliente'

// Pedido em montagem no cardápio público, guardado só neste navegador e separado por loja, para
// não se perder ao recarregar a página (critério da ZAP-101). Não guarda dados pessoais: nome e
// WhatsApp do cliente ficam para a identificação (ZAP-110).
const chave = (slug) => `zappi.pedido.${slug}`
let proximaChave = Date.now()
export const PEDIDO_VAZIO = { itens: [], data: '', hora: '', observacao: '' }

// Recheio e cobertura saíram (ZAP-140). Um pedido guardado antes da mudança não perde o que o
// cliente escreveu: os dois passam para o começo da observação do item.
export function semRecheioECobertura({ recheio, cobertura, ...item }) {
  const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '')
  const partes = [texto(recheio) && `Recheio: ${texto(recheio)}`, texto(cobertura) && `Cobertura: ${texto(cobertura)}`].filter(Boolean)
  if (!partes.length) return item
  const observacao = [...partes, typeof item.observacao === 'string' ? item.observacao : ''].filter(Boolean).join('. ')
  return { ...item, observacao: observacao.slice(0, LIMITES.observacaoItem) }
}

function ler(slug) {
  try {
    const guardado = JSON.parse(localStorage.getItem(chave(slug)) || 'null')
    if (!guardado || !Array.isArray(guardado.itens)) return { ...PEDIDO_VAZIO }
    return {
      itens: guardado.itens.filter((item) => item && typeof item.produtoId !== 'undefined' && Number(item.quantidade) > 0)
        .map((item) => ({ ...semRecheioECobertura(item), chave: item.chave ?? ++proximaChave })),
      data: typeof guardado.data === 'string' ? guardado.data : '',
      hora: typeof guardado.hora === 'string' ? guardado.hora : '',
      observacao: typeof guardado.observacao === 'string' ? guardado.observacao : '',
    }
  } catch {
    return { ...PEDIDO_VAZIO }
  }
}


export function usePedidoCliente(slug) {
  const [pedido, setPedido] = useState(() => ler(slug))

  useEffect(() => {
    try {
      localStorage.setItem(chave(slug), JSON.stringify(pedido))
    } catch {
      // Sem armazenamento: o pedido vale até fechar a página
    }
  }, [slug, pedido])

  const adicionar = useCallback((item) => {
    setPedido((atual) => ({ ...atual, itens: [...atual.itens, { ...item, chave: ++proximaChave }] }))
  }, [])

  const mudarItem = useCallback((chaveItem, mudancas) => {
    setPedido((atual) => ({ ...atual, itens: atual.itens.map((item) => (item.chave === chaveItem ? { ...item, ...mudancas } : item)) }))
  }, [])

  const remover = useCallback((chaveItem) => {
    setPedido((atual) => ({ ...atual, itens: atual.itens.filter((item) => item.chave !== chaveItem) }))
  }, [])

  const mudar = useCallback((campo, valor) => {
    setPedido((atual) => ({ ...atual, [campo]: valor }))
  }, [])

  return { pedido, adicionar, mudarItem, remover, mudar }
}
