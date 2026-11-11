import { describe, expect, test } from 'vitest'
import {
  dataMinima,
  dataPorExtenso,
  dataRetiradaISO,
  hojeEmSaoPaulo,
  HORARIOS,
  horaTexto,
  mensagemDoPedido,
  mudarQuantidade,
  quantidadeTexto,
  totalDoPedido,
  validarPedido,
} from './regrasPedidoCliente'

const bolo = { id: 1, sabor: 'Brigadeiro de chocolate', unidade: 'KG', preco: 100 }
const coxinha = { id: 4, sabor: 'Coxinha por unidade', unidade: 'UN', preco: 1.25 }
const produtos = [bolo, coxinha]
// 10/11/2026 às 23h30 em São Paulo (02h30 do dia 11 em UTC)
const agora = new Date('2026-11-11T02:30:00Z')

const pedido = (mudancas = {}) => ({
  itens: [
    { chave: 1, produtoId: 1, quantidade: 1.5, recheio: 'brigadeiro branco', cobertura: '', observacao: 'massa branca' },
    { chave: 2, produtoId: 4, quantidade: 20, recheio: '', cobertura: '', observacao: '' },
  ],
  data: '2026-11-17',
  hora: '15:30',
  observacao: 'Aniversário de 5 anos',
  ...mudancas,
})

describe('regras da montagem do pedido pelo cliente (ZAP-107)', () => {
  test('quantidade de 0,5 em 0,5 kg nos bolos e de 1 em 1 nos produtos por unidade (RN12)', () => {
    expect(mudarQuantidade(bolo, 1, 1)).toBe(1.5)
    expect(mudarQuantidade(bolo, 0.5, -1)).toBe(0.5)
    expect(mudarQuantidade(coxinha, 1, 1)).toBe(2)
    expect(mudarQuantidade(coxinha, 1, -1)).toBe(1)
    expect(quantidadeTexto(bolo, 1.5)).toBe('1,5 kg')
    expect(quantidadeTexto(coxinha, 1)).toBe('1 unidade')
    expect(quantidadeTexto(coxinha, 20)).toBe('20 unidades')
  })

  test('o total soma os itens e ignora produto que saiu do cardápio (RN11, RN14)', () => {
    expect(totalDoPedido(pedido().itens, produtos)).toBe(175)
    expect(totalDoPedido(pedido().itens, [bolo])).toBe(150)
  })

  test('a data mínima é hoje + 7 dias no horário de São Paulo, sem depender do fuso do aparelho (RN22)', () => {
    expect(hojeEmSaoPaulo(agora)).toBe('2026-11-10')
    expect(dataMinima(agora)).toBe('2026-11-17')
  })

  test('horários de 30 em 30 minutos, das 8h às 20h, e textos como nas mensagens', () => {
    expect(HORARIOS[0]).toBe('08:00')
    expect(HORARIOS.at(-1)).toBe('20:00')
    expect(HORARIOS).toHaveLength(25)
    expect(horaTexto('15:00')).toBe('15h')
    expect(horaTexto('09:30')).toBe('9h30')
    expect(dataPorExtenso('2026-11-17')).toBe('terça-feira, 17/11')
    expect(dataRetiradaISO('2026-11-17', '15:30')).toBe('2026-11-17T15:30:00-03:00')
  })

  test('não segue sem item, sem data, com menos de 7 dias ou sem hora', () => {
    expect(validarPedido(pedido(), produtos, agora)).toEqual({})
    expect(validarPedido(pedido({ itens: [] }), produtos, agora)).toHaveProperty('itens')
    expect(validarPedido(pedido({ data: '' }), produtos, agora).data).toBe('Escolha a data de retirada.')
    expect(validarPedido(pedido({ data: '2026-11-16' }), produtos, agora).data).toMatch(/a partir de 17\/11\/2026/)
    expect(validarPedido(pedido({ hora: '' }), produtos, agora).hora).toBe('Escolha a hora de retirada.')
    expect(validarPedido(pedido({ hora: '03:00' }), produtos, agora)).toHaveProperty('hora')
  })

  test('a mensagem do WhatsApp leva os itens, a personalização, a data e a hora e o total', () => {
    const texto = mensagemDoPedido({ nome: 'Casa Belt' }, pedido(), produtos)

    expect(texto).toContain('• Brigadeiro de chocolate — 1,5 kg (R$ 150,00)')
    expect(texto).toContain('  Recheio: brigadeiro branco')
    expect(texto).toContain('  Observação: massa branca')
    expect(texto).toContain('• Coxinha por unidade — 20 unidades (R$ 25,00)')
    expect(texto).toContain('Retirada: terça-feira, 17/11, às 15h30')
    expect(texto).toContain('Observação do pedido: Aniversário de 5 anos')
    expect(texto).toContain('Total estimado: R$ 175,00')
  })
})
