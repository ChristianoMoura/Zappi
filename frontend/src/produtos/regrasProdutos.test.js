import { describe, expect, test } from 'vitest'
import { lerPreco, ordenarAlergenos, precoParaTela, sugerirTextoAlternativo, validarProduto } from './regrasProdutos'

const produto = (extras) => ({ nome: 'Bolo de brigadeiro de chocolate', categoriaId: '1', unidade: 'KG', preco: '100,00', descricao: '', foto: '', textoAlternativo: '', ...extras })

describe('regras dos produtos (ZAP-27)', () => {
  test('lê o preço como a Lídia digita', () => {
    expect(lerPreco('100')).toBe(100)
    expect(lerPreco('100,5')).toBe(100.5)
    expect(lerPreco('R$ 1.250,00')).toBe(1250)
    expect(lerPreco('100.50')).toBe(100.5)
    expect(lerPreco('  ')).toBeNull()
    expect(lerPreco('cem')).toBeNaN()
    expect(precoParaTela(1.2)).toBe('1,20')
  })

  test('nome, categoria e preço maior que zero são obrigatórios (RF05, RN13, ZAP-139)', () => {
    expect(validarProduto(produto())).toEqual({})
    const erros = validarProduto(produto({ nome: ' ', categoriaId: '', preco: '0' }))
    expect(Object.keys(erros)).toEqual(['nome', 'categoriaId', 'preco'])
    expect(erros.categoriaId).toBe('Escolha a categoria do produto.')
    expect(erros.preco).toMatch(/maior que zero/)
    expect(validarProduto(produto({ preco: '' })).preco).toBe('Escreva o preço. Ex.: 100,00.')
    expect(validarProduto(produto({ preco: '10,0,0' })).preco).toMatch(/Use só números/)
  })

  test('a foto é opcional, mas com foto a descrição dela é obrigatória (RN15)', () => {
    expect(validarProduto(produto({ foto: '', textoAlternativo: '' }))).toEqual({})
    expect(validarProduto(produto({ foto: 'blob:foto', textoAlternativo: ' ' })).textoAlternativo).toMatch(/Descreva a foto/)
    expect(validarProduto(produto({ foto: 'blob:foto', textoAlternativo: 'Bolo de brigadeiro' }))).toEqual({})
  })

  test('respeita o tamanho das colunas do banco', () => {
    expect(validarProduto(produto({ nome: 'x'.repeat(150) })).nome).toBeUndefined()
    expect(validarProduto(produto({ nome: 'x'.repeat(151) })).nome).toBe('Use no máximo 150 caracteres.')
    expect(validarProduto(produto({ descricao: 'x'.repeat(501) })).descricao).toBe('Use no máximo 500 caracteres.')
    expect(validarProduto(produto({ outrosAlergenos: 'x'.repeat(301) })).outrosAlergenos).toBe('Use no máximo 300 caracteres.')
  })

  test('os alérgenos seguem a ordem da lista fixa e ignoram códigos desconhecidos (ZAP-132)', () => {
    expect(ordenarAlergenos(['GERGELIM', 'GLUTEN', 'PEIXES', 'OVOS'])).toEqual(['GLUTEN', 'OVOS', 'GERGELIM'])
    expect(ordenarAlergenos(undefined)).toEqual([])
  })

  test('sugere a descrição da foto com o nome do produto', () => {
    expect(sugerirTextoAlternativo({ nome: ' Bolo de ninho com morango ' })).toBe('Bolo de ninho com morango')
  })
})
