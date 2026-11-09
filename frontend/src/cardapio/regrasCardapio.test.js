import { describe, expect, test } from 'vitest'
import {
  agruparPorCategoria,
  filtrarProdutos,
  idCategoria,
  linkWhatsapp,
  mensagemPedido,
  plural,
  precoTexto,
  telefoneTexto,
  unidadeTexto,
} from './regrasCardapio'

const produtos = [
  { id: 1, nome: 'Bolo', sabor: 'Brigadeiro de chocolate', unidade: 'KG', preco: 100, descricao: 'Massa de chocolate.' },
  { id: 3, nome: 'Salgado', sabor: 'Cento de coxinha', unidade: 'UN', preco: 120, descricao: 'Cem coxinhas de frango.' },
  { id: 2, nome: 'Bolo', sabor: 'Ninho com morango', unidade: 'KG', preco: 115, descricao: 'Recheio de leite Ninho.' },
]

describe('regras do cardápio público (ZAP-105)', () => {
  test('agrupa por categoria na ordem do cardápio, com o título no plural', () => {
    const grupos = agruparPorCategoria(produtos)

    expect(grupos.map((g) => g.titulo)).toEqual(['Bolos', 'Salgados'])
    expect(grupos[0].produtos.map((p) => p.id)).toEqual([1, 2])
    expect(grupos[1].id).toBe('salgado')
  })

  test('plural e âncora da categoria', () => {
    expect(plural('Torta')).toBe('Tortas')
    expect(plural('Pão')).toBe('Pão')
    expect(idCategoria('Pão de mel')).toBe('pao-de-mel')
  })

  test('a busca ignora acentos e maiúsculas e procura no nome, sabor e descrição', () => {
    expect(filtrarProdutos(produtos, 'NINHO').map((p) => p.id)).toEqual([2])
    expect(filtrarProdutos(produtos, 'salgado').map((p) => p.id)).toEqual([3])
    expect(filtrarProdutos(produtos, 'chocolaté').map((p) => p.id)).toEqual([1])
    expect(filtrarProdutos(produtos, 'pastel')).toEqual([])
    expect(filtrarProdutos(produtos, '  ')).toHaveLength(3)
  })

  test('preço sempre com a unidade (CDC)', () => {
    expect(precoTexto(produtos[0])).toBe('R$ 100,00')
    expect(unidadeTexto(produtos[0])).toBe('por kg')
    expect(unidadeTexto(produtos[1])).toBe('por unidade')
  })

  test('link e telefone do WhatsApp da loja', () => {
    expect(linkWhatsapp('5511900000000')).toBe('https://wa.me/5511900000000')
    expect(linkWhatsapp('(11) 90000-0000', 'Olá!')).toBe('https://wa.me/5511900000000?text=Ol%C3%A1!')
    expect(telefoneTexto('5511900000000')).toBe('(11) 90000-0000')
  })

  test('a mensagem do pedido leva o produto, o preço e a observação', () => {
    const loja = { nome: 'Casa Belt' }

    expect(mensagemPedido(loja, produtos[0])).toBe(
      'Olá! Vi o cardápio da Casa Belt no Zappi e quero encomendar: Brigadeiro de chocolate (R$ 100,00 por kg).',
    )
    expect(mensagemPedido(loja, produtos[0], '  Escrever Feliz aniversário ')).toMatch(/\. Observação: Escrever Feliz aniversário$/)
  })
})
