import { describe, expect, test } from 'vitest'
import { agruparPorCategoria, moverNaLista, quantidadeTexto, validarNomeCategoria } from './regrasCategorias'

const categorias = [
  { id: 1, nome: 'Bolos' },
  { id: 2, nome: 'Salgados' },
]

describe('regras das categorias (ZAP-136, ZAP-139)', () => {
  test('o nome é obrigatório, tem até 60 caracteres e não se repete na loja', () => {
    expect(validarNomeCategoria('  ', categorias)).toMatch(/Escreva o nome da categoria/)
    expect(validarNomeCategoria('x'.repeat(61), categorias)).toBe('Use no máximo 60 caracteres.')
    expect(validarNomeCategoria(' bolos ', categorias)).toBe('Já existe a categoria "bolos".')
    expect(validarNomeCategoria('Doces finos', categorias)).toBe('')
  })

  test('ao editar, a categoria pode manter o próprio nome', () => {
    expect(validarNomeCategoria('BOLOS', categorias, 1)).toBe('')
    expect(validarNomeCategoria('Salgados', categorias, 1)).toMatch(/Já existe/)
  })

  test('move um item da lista para outra posição sem mudar a original', () => {
    const lista = ['a', 'b', 'c']
    expect(moverNaLista(lista, 2, 0)).toEqual(['c', 'a', 'b'])
    expect(moverNaLista(lista, 0, 1)).toEqual(['b', 'a', 'c'])
    expect(lista).toEqual(['a', 'b', 'c'])
  })

  test('agrupa os produtos por categoria, na ordem em que vêm da API', () => {
    const bolos = { id: 1, nome: 'Bolos' }
    const salgados = { id: 2, nome: 'Salgados' }
    const grupos = agruparPorCategoria([
      { id: 10, categoria: bolos },
      { id: 11, categoria: bolos },
      { id: 12, categoria: salgados },
      { id: 13, categoria: null },
    ])
    expect(grupos.map((g) => [g.categoria.nome, g.produtos.map((p) => p.id)])).toEqual([
      ['Bolos', [10, 11]],
      ['Salgados', [12]],
      ['Sem categoria', [13]],
    ])
  })

  test('escreve a quantidade de produtos no singular e no plural', () => {
    expect(quantidadeTexto(1)).toBe('1 produto')
    expect(quantidadeTexto(0)).toBe('0 produtos')
  })
})
