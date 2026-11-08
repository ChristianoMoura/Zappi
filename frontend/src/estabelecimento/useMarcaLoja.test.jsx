import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, test } from 'vitest'
import { buscarEstabelecimento, salvarEstabelecimento } from './servicoEstabelecimento'
import { iniciaisDaLoja, useMarcaLoja } from './useMarcaLoja'

describe('marca da loja no topo e no login (collab Casa Belt × Zappi)', () => {
  test('usa o nome e o logo do Meu estabelecimento e muda assim que ele é salvo', async () => {
    const original = await buscarEstabelecimento()
    const { result } = renderHook(() => useMarcaLoja())

    await waitFor(() => expect(result.current).toEqual({ nome: original.nome, logo: original.logo }))

    await act(() => salvarEstabelecimento({ ...original, nome: 'Casa Belt Doces', logo: 'logo-novo.png' }))
    expect(result.current).toEqual({ nome: 'Casa Belt Doces', logo: 'logo-novo.png' })

    // Devolve os dados de teste como estavam, para os outros testes
    await act(() => salvarEstabelecimento(original))
  })

  test('sem logo, usa as iniciais do nome', () => {
    expect(iniciaisDaLoja('Casa Belt')).toBe('CB')
    expect(iniciaisDaLoja('  ')).toBe('Z')
  })
})
