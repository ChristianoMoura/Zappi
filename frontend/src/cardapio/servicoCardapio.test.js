import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { buscarCardapio, CardapioNaoEncontradoError, ServicoIndisponivelError } from './servicoCardapio'

const json = (status, corpo) => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })

const estabelecimento = { nome: 'Casa Belt', slug: 'casa-belt', descricao: null, whatsapp: '5511900000000', logo: null, capa: 'https://storage/capa.webp' }

// Formato da ZAP-138: categorias na ordem da loja e o produto com nome único e categoria
const doBackend = {
  estabelecimento,
  categorias: [{ id: 2, nome: 'Salgados' }, { id: 1, nome: 'Bolos' }],
  produtos: [{ id: 1, nome: 'Bolo de ninho', categoria: { id: 1, nome: 'Bolos' }, unidade: 'KG', preco: '115.00', descricao: null, foto: null, textoAlternativo: null }],
}

describe('servicoCardapio (rota pública da ZAP-104)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  describe('em produção', () => {
    beforeEach(() => vi.stubEnv('DEV', false))

    test('pede o cardápio pelo link, sem token, e troca nulos por texto vazio', async () => {
      const buscar = vi.fn(async () => json(200, doBackend))
      vi.stubGlobal('fetch', buscar)

      const cardapio = await buscarCardapio('casa-belt')

      expect(buscar).toHaveBeenCalledWith('/api/cardapio/casa-belt')
      expect(cardapio.estabelecimento).toEqual({ nome: 'Casa Belt', slug: 'casa-belt', descricao: '', whatsapp: '5511900000000', logo: '', capa: 'https://storage/capa.webp', destacarPromocoes: true })
      expect(cardapio.produtos[0]).toMatchObject({ preco: 115, descricao: '', foto: '', textoAlternativo: '' })
    })

    test('traz as categorias na ordem da loja e o produto com o nome e a categoria (ZAP-140)', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => json(200, doBackend)))

      const cardapio = await buscarCardapio('casa-belt')

      expect(cardapio.categorias).toEqual([{ id: 2, nome: 'Salgados' }, { id: 1, nome: 'Bolos' }])
      expect(cardapio.produtos[0]).toMatchObject({ nome: 'Bolo de ninho', categoriaId: 1, categoria: 'Bolos' })
      expect(cardapio.produtos[0]).not.toHaveProperty('sabor')
    })

    test('até a ZAP-138, o formato antigo vira o novo: o tipo vira a categoria e o sabor, o nome', async () => {
      const antigo = {
        estabelecimento,
        produtos: [
          { id: 1, nome: 'Bolo', sabor: 'Ninho com morango', unidade: 'KG', preco: 115 },
          { id: 3, nome: 'Salgado', sabor: 'Cento de coxinha', unidade: 'UN', preco: 120 },
          { id: 2, nome: 'Bolo', sabor: 'Brigadeiro', unidade: 'KG', preco: 100 },
        ],
      }
      vi.stubGlobal('fetch', vi.fn(async () => json(200, antigo)))

      const cardapio = await buscarCardapio('casa-belt')

      expect(cardapio.categorias.map((c) => c.nome)).toEqual(['Bolo', 'Salgado'])
      expect(cardapio.produtos.map((p) => [p.nome, p.categoria])).toEqual([
        ['Ninho com morango', 'Bolo'],
        ['Cento de coxinha', 'Salgado'],
        ['Brigadeiro', 'Bolo'],
      ])
      expect(cardapio.produtos[0].categoriaId).toBe(cardapio.produtos[2].categoriaId)
    })

    test('link que não existe vira CardapioNaoEncontradoError', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => json(404, { codigo: 'ESTABELECIMENTO_NAO_ENCONTRADO' })))
      await expect(buscarCardapio('nao-existe')).rejects.toBeInstanceOf(CardapioNaoEncontradoError)
    })

    test('sem conexão ou erro do servidor vira ServicoIndisponivelError', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('rede') }))
      await expect(buscarCardapio('casa-belt')).rejects.toBeInstanceOf(ServicoIndisponivelError)

      vi.stubGlobal('fetch', vi.fn(async () => json(500, {})))
      await expect(buscarCardapio('casa-belt')).rejects.toBeInstanceOf(ServicoIndisponivelError)
    })
  })

  describe('em desenvolvimento, enquanto a rota pública não existe', () => {
    test('usa o cardápio simulado da Casa Belt', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => json(401, { codigo: 'NAO_AUTENTICADO' })))

      const cardapio = await buscarCardapio('casa-belt')

      expect(cardapio.estabelecimento.nome).toBe('Casa Belt')
      expect(cardapio.produtos).toHaveLength(4)
      expect(cardapio.categorias.map((c) => c.nome)).toEqual(['Bolos', 'Salgados'])
      expect(cardapio.produtos[0]).toMatchObject({ nome: 'Bolo de brigadeiro de chocolate', categoria: 'Bolos' })
    })

    test('o simulado também responde link inexistente', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('rede') }))
      await expect(buscarCardapio('outra-loja')).rejects.toBeInstanceOf(CardapioNaoEncontradoError)
    })
  })
})
