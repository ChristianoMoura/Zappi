import { describe, expect, test } from 'vitest'
import { emPromocao, lerPreco, ordenarAlergenos, precoParaTela, precoVigente, sugerirTextoAlternativo, temPromocaoNaApi, validarProduto, validarPromocao } from './regrasProdutos'

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

describe('preço promocional (ZAP-152, ZAP-161)', () => {
  test('o preço com desconto precisa ser maior que zero e menor que o preço antes', () => {
    expect(validarPromocao({ preco: '100,00', precoPromocional: '80' })).toEqual({})
    expect(validarPromocao({ preco: '100,00', precoPromocional: '100' })).toEqual({ precoPromocional: 'O preço com desconto precisa ser menor que o preço antes da promoção.' })
    expect(validarPromocao({ preco: '100,00', precoPromocional: '0' })).toEqual({ precoPromocional: 'O preço com desconto precisa ser maior que zero.' })
    expect(validarPromocao({ preco: '100,00', precoPromocional: '' })).toEqual({ precoPromocional: 'Escreva o preço com desconto. Ex.: 80,00.' })
    expect(validarPromocao({ preco: '', precoPromocional: '80' })).toEqual({ preco: 'Escreva o preço antes da promoção. Ex.: 100,00.' })
    expect(validarPromocao({ preco: '100', precoPromocional: 'oitenta' })).toEqual({ precoPromocional: 'Use só números e vírgula. Ex.: 80,00.' })
  })

  test('o preço que vale é o com desconto, se houver; sem o campo, o backend ainda não tem promoção', () => {
    expect(precoVigente({ preco: 100, precoPromocional: 80 })).toBe(80)
    expect(precoVigente({ preco: 100, precoPromocional: null })).toBe(100)
    expect(emPromocao({ preco: 100, precoPromocional: null })).toBe(false)
    expect(temPromocaoNaApi({ preco: 100, precoPromocional: null })).toBe(true)
    expect(temPromocaoNaApi({ preco: 100 })).toBe(false)
  })
})
