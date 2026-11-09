import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { buscarCardapio, CardapioNaoEncontradoError, ServicoIndisponivelError } from './servicoCardapio'

const json = (status, corpo) => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })

const doBackend = {
  estabelecimento: { nome: 'Casa Belt', slug: 'casa-belt', descricao: null, whatsapp: '5511900000000', logo: null, capa: 'https://storage/capa.webp' },
  produtos: [{ id: 1, nome: 'Bolo', sabor: 'Ninho', unidade: 'KG', preco: '115.00', descricao: null, foto: null, textoAlternativo: null }],
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
      expect(cardapio.estabelecimento).toEqual({ nome: 'Casa Belt', slug: 'casa-belt', descricao: '', whatsapp: '5511900000000', logo: '', capa: 'https://storage/capa.webp' })
      expect(cardapio.produtos[0]).toMatchObject({ preco: 115, descricao: '', foto: '', textoAlternativo: '' })
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
    })

    test('o simulado também responde link inexistente', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('rede') }))
      await expect(buscarCardapio('outra-loja')).rejects.toBeInstanceOf(CardapioNaoEncontradoError)
    })
  })
})
