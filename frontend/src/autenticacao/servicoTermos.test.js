import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buscarTermosVigentes, esquecerTermosVigentes, guardarVersaoAceita, lerVersaoAceita } from './servicoTermos'

const json = (status, corpo) => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })

describe('servicoTermos (ZAP-147)', () => {
  beforeEach(() => esquecerTermosVigentes())

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('lê a versão vigente na rota pública, sem token, e consulta uma vez só', async () => {
    const buscar = vi.fn(async () => json(200, { versao: 2, data: '2026-11-14' }))
    vi.stubGlobal('fetch', buscar)

    await expect(buscarTermosVigentes()).resolves.toEqual({ versao: 2, data: '2026-11-14' })
    await buscarTermosVigentes()
    expect(buscar).toHaveBeenCalledTimes(1)
    expect(buscar).toHaveBeenCalledWith('/api/publico/termos')
  })

  it.each([
    ['a rota ainda não existe (404)', async () => json(404, { codigo: 'ROTA_NAO_ENCONTRADA' })],
    ['a resposta não tem a versão', async () => json(200, { nome: 'outra coisa' })],
    ['não há conexão', async () => Promise.reject(new TypeError('Failed to fetch'))],
  ])('devolve nulo quando %s, para a tela esconder a caixa', async (_caso, responder) => {
    vi.stubGlobal('fetch', vi.fn(responder))
    await expect(buscarTermosVigentes()).resolves.toBeNull()
  })

  it('guarda só a versão aceita como lembrete neste aparelho', () => {
    expect(lerVersaoAceita()).toBeNull()
    guardarVersaoAceita(3)
    expect(localStorage.getItem('zappi.termos-aceitos')).toBe('3')
    expect(lerVersaoAceita()).toBe(3)
  })

  it('funciona sem o armazenamento do navegador', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    expect(() => guardarVersaoAceita(1)).not.toThrow()
    expect(lerVersaoAceita()).toBeNull()
  })
})
