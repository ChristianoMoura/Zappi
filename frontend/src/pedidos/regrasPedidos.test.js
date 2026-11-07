import { describe, expect, test } from 'vitest'
import {
  colunasVisiveis,
  dataRetiradaCurta,
  moeda,
  pedidosDaColuna,
  quantidadeTexto,
  resumoItens,
  retiraHoje,
  STATUS,
  totalPedido,
} from './regrasPedidos'

const hoje = new Date(2026, 10, 7) // sábado, 07/11/2026

const pedido = (extras) => ({
  numero: 1,
  status: STATUS.NOVO,
  dataRetirada: '2026-11-14',
  itens: [
    { produto: 'Bolo', sabor: 'Ninho com morango', unidade: 'KG', quantidade: 1.5, precoUnitario: 115 },
    { produto: 'Salgado', sabor: 'Coxinha de frango', unidade: 'UN', quantidade: 100, precoUnitario: 1.2 },
  ],
  ...extras,
})

describe('regras do quadro de pedidos (ZAP-28)', () => {
  test('esconde a coluna Recusado até ligar o filtro (RN04)', () => {
    expect(colunasVisiveis(false).map((c) => c.nome)).toEqual(['Novo', 'Confirmado', 'Em produção', 'Concluído'])
    expect(colunasVisiveis(true).map((c) => c.nome)).toContain('Recusado')
  })

  test('soma os subtotais com o preço congelado (RN10, RN11)', () => {
    expect(totalPedido(pedido())).toBe(292.5)
    expect(moeda(292.5)).toBe('R$ 292,50')
  })

  test('mostra fração só em KG (RN12)', () => {
    expect(resumoItens(pedido())).toBe('Bolo de ninho com morango · 1,5 kg + Coxinha de frango · 100 un')
    expect(quantidadeTexto({ unidade: 'UN', quantidade: 10 })).toBe('10 un')
  })

  test('escreve a data de retirada com o dia da semana ou "hoje"', () => {
    expect(dataRetiradaCurta('2026-11-14', hoje)).toBe('sáb, 14/11')
    expect(dataRetiradaCurta('2026-11-15', hoje)).toBe('dom, 15/11')
    expect(dataRetiradaCurta('2026-11-07', hoje)).toBe('hoje, 07/11')
  })

  test('marca "Retira hoje" só em pedido aceito que ainda não ficou pronto', () => {
    expect(retiraHoje(pedido({ dataRetirada: '2026-11-07', status: STATUS.EM_PRODUCAO }), hoje)).toBe(true)
    expect(retiraHoje(pedido({ dataRetirada: '2026-11-07', status: STATUS.CONCLUIDO }), hoje)).toBe(false)
    expect(retiraHoje(pedido({ dataRetirada: '2026-11-07', status: STATUS.RECUSADO }), hoje)).toBe(false)
    expect(retiraHoje(pedido(), hoje)).toBe(false)
  })

  test('ordena a coluna pela data de retirada', () => {
    const lista = [pedido({ numero: 2, dataRetirada: '2026-11-20' }), pedido({ numero: 3, dataRetirada: '2026-11-09' }), pedido({ numero: 4, status: STATUS.CONFIRMADO })]
    expect(pedidosDaColuna(lista, STATUS.NOVO).map((p) => p.numero)).toEqual([3, 2])
  })
})
