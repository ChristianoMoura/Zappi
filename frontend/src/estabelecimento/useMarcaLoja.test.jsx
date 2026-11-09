import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { salvarEstabelecimento } from './servicoEstabelecimento'
import { iniciaisDaLoja, useMarcaLoja } from './useMarcaLoja'

const doBackend = { nome: 'Casa Belt', slug: 'casa-belt', whatsapp: '5511900000000' }

const json = (corpo) => new Response(JSON.stringify(corpo), { status: 200, headers: { 'Content-Type': 'application/json' } })

describe('marca da loja no topo do painel (collab Casa Belt × Zappi)', () => {
  beforeEach(() => {
    sessionStorage.setItem('zappi.sessao', JSON.stringify({ token: 'jwt-de-teste', nome: 'Lídia' }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  test('usa o nome e o logo do Meu estabelecimento e muda assim que ele é salvo', async () => {
    const logo = 'https://storage.teste/estabelecimentos/1/logo-abcd1234.webp'
    const respostas = [json(doBackend), json({ ...doBackend, nome: 'Casa Belt Doces', logo })]
    vi.stubGlobal('fetch', vi.fn(async () => respostas.shift()))
    const { result } = renderHook(() => useMarcaLoja())

    await waitFor(() => expect(result.current).toEqual({ nome: 'Casa Belt', logo: '' }))

    await act(() => salvarEstabelecimento({ ...doBackend, nome: 'Casa Belt Doces', logo, capa: '' }))
    expect(result.current).toEqual({ nome: 'Casa Belt Doces', logo })
  })

  test('sem login, fica sem marca e não chama a API', async () => {
    sessionStorage.clear()
    const buscar = vi.fn()
    vi.stubGlobal('fetch', buscar)
    const { result } = renderHook(() => useMarcaLoja())

    await waitFor(() => expect(result.current).toBeNull())
    expect(buscar).not.toHaveBeenCalled()
  })

  test('sem logo, usa as iniciais do nome', () => {
    expect(iniciaisDaLoja('Casa Belt')).toBe('CB')
    expect(iniciaisDaLoja('  ')).toBe('Z')
  })
})
