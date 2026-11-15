import { describe, expect, test } from 'vitest'
import {
  agruparPorCategoria,
  filtrarProdutos,
  linkWhatsapp,
  mensagemPedido,
  precoTexto,
  secaoPromocoes,
  telefoneTexto,
  textoPrecoLido,
  unidadeTexto,
} from './regrasCardapio'

// Categorias na ordem do painel: Salgados antes de Bolos, e Tortas sem produto (ZAP-140)
const categorias = [
  { id: 2, nome: 'Salgados' },
  { id: 1, nome: 'Bolos' },
  { id: 3, nome: 'Tortas' },
]
const produtos = [
  { id: 1, nome: 'Bolo de brigadeiro de chocolate', categoriaId: 1, categoria: 'Bolos', unidade: 'KG', preco: 100, descricao: 'Massa de chocolate.' },
  { id: 3, nome: 'Cento de coxinha', categoriaId: 2, categoria: 'Salgados', unidade: 'UN', preco: 120, descricao: 'Cem coxinhas de frango.' },
  { id: 2, nome: 'Bolo de ninho com morango', categoriaId: 1, categoria: 'Bolos', unidade: 'KG', preco: 115, descricao: 'Recheio de leite Ninho.' },
]

describe('regras do cardápio público (ZAP-105)', () => {
  test('agrupa pelas categorias do painel, na ordem da loja, com o nome como foi cadastrado (ZAP-140)', () => {
    const grupos = agruparPorCategoria(produtos, categorias)

    expect(grupos.map((g) => g.titulo)).toEqual(['Salgados', 'Bolos'])
    expect(grupos.map((g) => g.id)).toEqual([2, 1])
    expect(grupos[1].produtos.map((p) => p.id)).toEqual([1, 2])
  })

  test('produto de categoria desconhecida vai para "Outros", no fim', () => {
    const grupos = agruparPorCategoria([...produtos, { id: 9, nome: 'Brownie', categoriaId: 99 }], categorias)

    expect(grupos.at(-1)).toMatchObject({ id: 'outros', titulo: 'Outros' })
    expect(grupos.at(-1).produtos.map((p) => p.id)).toEqual([9])
  })

  test('a busca ignora acentos e maiúsculas e procura no nome, na descrição e na categoria', () => {
    expect(filtrarProdutos(produtos, 'NINHO').map((p) => p.id)).toEqual([2])
    expect(filtrarProdutos(produtos, 'salgado').map((p) => p.id)).toEqual([3])
    expect(filtrarProdutos(produtos, 'bolos').map((p) => p.id)).toEqual([1, 2])
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
      'Olá! Vi o cardápio da Casa Belt no Zappi e quero encomendar: Bolo de brigadeiro de chocolate (R$ 100,00 por kg).',
    )
    expect(mensagemPedido(loja, produtos[0], '  Escrever Feliz aniversário ')).toMatch(/\. Observação: Escrever Feliz aniversário$/)
  })

  test('promoção: o preço vigente é o com desconto, e o leitor de tela ouve o "De ... por ..." (ZAP-162)', () => {
    const ninho = { id: 2, nome: 'Bolo de ninho', unidade: 'KG', preco: 115, precoPromocional: 100 }
    expect(precoTexto(ninho)).toBe('R$ 100,00')
    expect(textoPrecoLido(ninho)).toBe('De R$ 115,00 por R$ 100,00 por kg, 13% de desconto')
    expect(textoPrecoLido({ ...ninho, precoPromocional: 114.5 })).toBe('De R$ 115,00 por R$ 114,50 por kg')
  })

  test('seção Promoções: só com o destaque ligado, sem busca e com produto em promoção, na ordem das categorias (ZAP-162)', () => {
    const categorias = [
      { id: 2, titulo: 'Salgados', produtos: [{ id: 3, preco: 120, precoPromocional: 99 }] },
      { id: 1, titulo: 'Bolos', produtos: [{ id: 1, preco: 100, precoPromocional: null }, { id: 2, preco: 115, precoPromocional: 100 }] },
    ]
    const secao = secaoPromocoes(categorias, { destacar: true, buscando: false })
    expect(secao).toMatchObject({ id: 'promocoes', titulo: 'Promoções', promocoes: true })
    expect(secao.produtos.map((p) => p.id)).toEqual([3, 2])
    expect(secaoPromocoes(categorias, { destacar: false, buscando: false })).toBeNull()
    expect(secaoPromocoes(categorias, { destacar: true, buscando: true })).toBeNull()
    expect(secaoPromocoes([categorias[1]].map((c) => ({ ...c, produtos: [c.produtos[0]] })), { destacar: true, buscando: false })).toBeNull()
  })
})
