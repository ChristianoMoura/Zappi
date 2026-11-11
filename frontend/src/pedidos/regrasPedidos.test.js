import { describe, expect, test } from 'vitest'
import {
  colunasVisiveis,
  dataRetiradaCurta,
  dataRetiradaMensagem,
  horaTexto,
  HORARIOS_RETIRADA,
  mensagensDaEtapa,
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

  test('o selo "Retira hoje" vale pelo dia, em qualquer horário', () => {
    for (const hora of ['08:00', '20:00']) {
      expect(retiraHoje(pedido({ dataRetirada: `2026-11-07T${hora}`, status: STATUS.CONFIRMADO }), hoje)).toBe(true)
    }
    expect(retiraHoje(pedido({ dataRetirada: '2026-11-08T08:00', status: STATUS.CONFIRMADO }), hoje)).toBe(false)
  })

  test('ordena a coluna pela data de retirada', () => {
    const lista = [pedido({ numero: 2, dataRetirada: '2026-11-20' }), pedido({ numero: 3, dataRetirada: '2026-11-09' }), pedido({ numero: 4, status: STATUS.CONFIRMADO })]
    expect(pedidosDaColuna(lista, STATUS.NOVO).map((p) => p.numero)).toEqual([3, 2])
  })
})

describe('mensagens da etapa (ZAP-51)', () => {
  const comMensagens = (status, mensagens) => ({ status, mensagens: mensagens.map((tipo) => ({ tipo })) })

  test('só a mensagem da etapa atual pode ser enviada', () => {
    expect(mensagensDaEtapa(comMensagens(STATUS.CONFIRMADO, ['Confirmação'])).atual.indice).toBe(0)
    const concluido = mensagensDaEtapa(comMensagens(STATUS.CONCLUIDO, ['Confirmação', 'Pronto para retirada']))
    expect(concluido.atual.mensagem.tipo).toBe('Pronto para retirada')
    expect(concluido.anteriores.map((a) => a.mensagem.tipo)).toEqual(['Confirmação'])
  })

  test('em Novo e em Em produção não há mensagem a enviar', () => {
    expect(mensagensDaEtapa(comMensagens(STATUS.NOVO, [])).atual).toBeNull()
    const emProducao = mensagensDaEtapa(comMensagens(STATUS.EM_PRODUCAO, ['Confirmação']))
    expect(emProducao.atual).toBeNull()
    expect(emProducao.anteriores).toHaveLength(1)
  })

  test('concluído de novo depois de uma volta usa o aviso de pronto mais recente', () => {
    const { atual } = mensagensDaEtapa(comMensagens(STATUS.CONCLUIDO, ['Confirmação', 'Pronto para retirada', 'Pronto para retirada']))
    expect(atual.indice).toBe(2)
  })

  test('escreve a data da mensagem por extenso', () => {
    expect(dataRetiradaMensagem('2026-11-14', hoje)).toBe('sábado, 14/11')
    expect(dataRetiradaMensagem('2026-11-07', hoje)).toBe('hoje, sábado, 07/11')
  })

  test('mostra o horário da retirada no card, nos detalhes e na mensagem (ZAP-127)', () => {
    expect(dataRetiradaCurta('2026-11-14T15:00', hoje)).toBe('sáb, 14/11, 15h')
    expect(dataRetiradaCurta('2026-11-07T08:30', hoje)).toBe('hoje, 07/11, 8h30')
    expect(dataRetiradaMensagem('2026-11-14T15:00', hoje)).toBe('sábado, 14/11, às 15h')
    expect(dataRetiradaMensagem('2026-11-07T19:30', hoje)).toBe('hoje, sábado, 07/11, às 19h30')
    expect(retiraHoje(pedido({ dataRetirada: '2026-11-07T20:00', status: STATUS.CONFIRMADO }), hoje)).toBe(true)
  })

  test('oferece os horários das 8h às 20h, de 30 em 30 minutos (RN23)', () => {
    expect(HORARIOS_RETIRADA).toHaveLength(25)
    expect(HORARIOS_RETIRADA.slice(0, 3)).toEqual(['08:00', '08:30', '09:00'])
    expect(HORARIOS_RETIRADA.at(-1)).toBe('20:00')
    expect(horaTexto('09:30')).toBe('9h30')
  })

  test('na mesma data, quem retira mais cedo aparece primeiro', () => {
    const lista = [pedido({ numero: 2, dataRetirada: '2026-11-09T15:00' }), pedido({ numero: 3, dataRetirada: '2026-11-09T09:30' })]
    expect(pedidosDaColuna(lista, STATUS.NOVO).map((p) => p.numero)).toEqual([3, 2])
  })
})
