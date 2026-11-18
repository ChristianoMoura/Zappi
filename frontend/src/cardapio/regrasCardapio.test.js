import { describe, expect, test } from 'vitest'
import {
  agruparPorCategoria,
  artigoDoProduto,
  enderecoDaLoja,
  filtrarProdutos,
  linkGoogleMaps,
  mensagemAlergia,
  linkWhatsapp,
  mapaGoogle,
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

describe('endereço de retirada (ZAP-186)', () => {
  const COMPLETO = { cep: '01000000', logradouro: 'Rua das Flores', numero: '123', complemento: 'casa 2', bairro: 'Centro', cidade: 'São Paulo', uf: 'SP' }

  test('monta as linhas da tela, o texto numa linha só e a busca do Google Maps', () => {
    const endereco = enderecoDaLoja({ endereco: COMPLETO })

    expect(endereco.linhas).toEqual(['Rua das Flores, 123, casa 2', 'Centro, São Paulo/SP', 'CEP 01000-000'])
    expect(endereco.texto).toBe('Rua das Flores, 123, casa 2 · Centro, São Paulo/SP · CEP 01000-000')
    expect(linkGoogleMaps(endereco)).toBe(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Rua das Flores, 123, casa 2, Centro, São Paulo/SP, 01000000')}`)
  })

  test('sem complemento, bairro, UF ou CEP, mostra só o que tem', () => {
    const endereco = enderecoDaLoja({ endereco: { ...COMPLETO, complemento: '', bairro: '  ', uf: '', cep: '' } })

    expect(endereco.linhas).toEqual(['Rua das Flores, 123', 'São Paulo'])
  })

  test('sem rua, número ou cidade, não há endereço (a tela pede para combinar pelo WhatsApp)', () => {
    expect(enderecoDaLoja({ endereco: { ...COMPLETO, logradouro: '' } })).toBeNull()
    expect(enderecoDaLoja({ endereco: { ...COMPLETO, numero: ' ' } })).toBeNull()
    expect(enderecoDaLoja({ endereco: { ...COMPLETO, cidade: '' } })).toBeNull()
    expect(enderecoDaLoja({})).toBeNull()
  })

  test('mapa embutido só com a chave do Google', () => {
    const endereco = enderecoDaLoja({ endereco: COMPLETO })

    expect(mapaGoogle(endereco, 'chave-teste')).toBe(`https://www.google.com/maps/embed/v1/place?key=chave-teste&q=${encodeURIComponent(endereco.busca)}`)
    expect(mapaGoogle(endereco, '')).toBeNull()
    expect(mapaGoogle(endereco, undefined)).toBeNull()
  })
})

describe('mensagem de alergia (revisão das mensagens, ZAP-65)', () => {
  test('usa o artigo do produto pela primeira palavra do nome', () => {
    expect(artigoDoProduto('Bolo de brigadeiro de chocolate')).toBe('o')
    expect(artigoDoProduto('Torta de limão')).toBe('a')
    expect(artigoDoProduto('Coxinha de frango')).toBe('a')
    expect(artigoDoProduto('Cento de coxinha')).toBe('o')
    expect(artigoDoProduto('Pudim')).toBe('o')
    expect(artigoDoProduto('Brigadeiros gourmet')).toBe('os')
    expect(artigoDoProduto('Empadas de palmito')).toBe('as')
    expect(artigoDoProduto('Mousse de maracujá')).toBe('a')
    expect(artigoDoProduto('Quiche de alho-poró')).toBe('a')
    expect(artigoDoProduto('Mini pizza')).toBe('a')
    expect(artigoDoProduto('Kit festa')).toBe('o')
  })

  test('pergunta se dá para fazer o produto sem algum ingrediente', () => {
    expect(mensagemAlergia({ nome: 'Torta de limão' })).toBe('Olá! Tenho alergia e queria saber se dá para fazer a Torta de limão sem algum ingrediente.')
    expect(mensagemAlergia({ nome: 'Bolo de brigadeiro de chocolate' })).toBe(
      'Olá! Tenho alergia e queria saber se dá para fazer o Bolo de brigadeiro de chocolate sem algum ingrediente.',
    )
  })
})
