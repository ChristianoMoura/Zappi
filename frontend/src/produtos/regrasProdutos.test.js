import { describe, expect, test } from 'vitest'
import { lerPreco, nomeCompleto, ordenarAlergenos, precoParaTela, sugerirTextoAlternativo, validarProduto } from './regrasProdutos'

const produto = (extras) => ({ nome: 'Bolo', sabor: 'Brigadeiro de chocolate', unidade: 'KG', preco: '100,00', descricao: '', foto: '', textoAlternativo: '', ...extras })

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

  test('nome, sabor e preço maior que zero são obrigatórios (RF05, RN13)', () => {
    expect(validarProduto(produto())).toEqual({})
    const erros = validarProduto(produto({ nome: ' ', sabor: '', preco: '0' }))
    expect(Object.keys(erros)).toEqual(['nome', 'sabor', 'preco'])
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
    expect(validarProduto(produto({ sabor: 'x'.repeat(101) })).sabor).toBe('Use no máximo 100 caracteres.')
    expect(validarProduto(produto({ descricao: 'x'.repeat(501) })).descricao).toBe('Use no máximo 500 caracteres.')
    expect(validarProduto(produto({ outrosAlergenos: 'x'.repeat(301) })).outrosAlergenos).toBe('Use no máximo 300 caracteres.')
  })

  test('os alérgenos seguem a ordem da lista fixa e ignoram códigos desconhecidos (ZAP-132)', () => {
    expect(ordenarAlergenos(['GERGELIM', 'GLUTEN', 'PEIXES', 'OVOS'])).toEqual(['GLUTEN', 'OVOS', 'GERGELIM'])
    expect(ordenarAlergenos(undefined)).toEqual([])
  })

  test('sugere a descrição da foto com o nome e o sabor', () => {
    expect(nomeCompleto({ nome: 'Salgado', sabor: 'Coxinha de frango' })).toBe('Salgado de coxinha de frango')
    expect(sugerirTextoAlternativo({ nome: 'Bolo', sabor: 'Ninho com morango' })).toBe('Bolo de ninho com morango')
    expect(sugerirTextoAlternativo({ nome: 'Bolo', sabor: '' })).toBe('Bolo')
  })
})
