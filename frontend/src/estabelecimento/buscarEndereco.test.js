import { afterEach, describe, expect, it, vi } from 'vitest'
import { BuscaCepIndisponivelError, buscarEnderecoPorCep, CepNaoEncontradoError } from './buscarEndereco'

const json = (status, corpo) => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })

const doViaCep = { cep: '01001-000', logradouro: 'Praça da Sé', bairro: 'Sé', localidade: 'São Paulo', uf: 'SP' }
const daBrasilApi = { cep: '01001000', street: 'Praça da Sé', neighborhood: 'Sé', city: 'São Paulo', state: 'SP' }
const endereco = { logradouro: 'Praça da Sé', bairro: 'Sé', cidade: 'São Paulo', uf: 'SP' }

// fetch simulado por API: cada uma responde com o que foi pedido, ou falha
function simular({ viaCep, brasilApi }) {
  const buscar = vi.fn(async (url) => {
    const resposta = String(url).includes('viacep') ? viaCep : brasilApi
    if (resposta instanceof Error) throw resposta
    return resposta
  })
  vi.stubGlobal('fetch', buscar)
  return buscar
}

describe('buscarEnderecoPorCep (ZAP-121)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('usa a ViaCEP e devolve rua, bairro, cidade e UF', async () => {
    const buscar = simular({ viaCep: json(200, doViaCep) })

    await expect(buscarEnderecoPorCep('01001000')).resolves.toEqual(endereco)
    expect(buscar).toHaveBeenCalledTimes(1)
    const [[url, opcoes]] = buscar.mock.calls
    expect(url).toBe('https://viacep.com.br/ws/01001000/json/')
    // Nada além do CEP sai do sistema: sem token nem cabeçalhos
    expect(opcoes.headers).toBeUndefined()
  })

  it('com a ViaCEP fora do ar, usa a BrasilAPI', async () => {
    const buscar = simular({ viaCep: new TypeError('Failed to fetch'), brasilApi: json(200, daBrasilApi) })

    await expect(buscarEnderecoPorCep('01001000')).resolves.toEqual(endereco)
    expect(buscar.mock.calls[1][0]).toBe('https://brasilapi.com.br/api/cep/v1/01001000')
  })

  it('CEP que a ViaCEP não conhece ainda é procurado na BrasilAPI', async () => {
    simular({ viaCep: json(200, { erro: 'true' }), brasilApi: json(200, daBrasilApi) })

    await expect(buscarEnderecoPorCep('01001000')).resolves.toEqual(endereco)
  })

  it('CEP que nenhuma das duas conhece vira CepNaoEncontradoError', async () => {
    simular({ viaCep: json(200, { erro: 'true' }), brasilApi: json(404, { message: 'CEP não encontrado' }) })

    await expect(buscarEnderecoPorCep('99999999')).rejects.toBeInstanceOf(CepNaoEncontradoError)
  })

  it('não encontrado em uma e fora do ar na outra também é CEP não encontrado', async () => {
    simular({ viaCep: json(200, { erro: 'true' }), brasilApi: json(500, {}) })

    await expect(buscarEnderecoPorCep('99999999')).rejects.toBeInstanceOf(CepNaoEncontradoError)
  })

  it('sem resposta de nenhuma vira BuscaCepIndisponivelError', async () => {
    simular({ viaCep: json(503, {}), brasilApi: new TypeError('Failed to fetch') })

    await expect(buscarEnderecoPorCep('01001000')).rejects.toBeInstanceOf(BuscaCepIndisponivelError)
  })

  it('o que não vier fica vazio, e a UF vai em maiúsculas', async () => {
    simular({ viaCep: json(200, { cep: '13960-000', logradouro: '', bairro: '', localidade: ' Socorro ', uf: 'sp' }) })

    await expect(buscarEnderecoPorCep('13960000')).resolves.toEqual({ logradouro: '', bairro: '', cidade: 'Socorro', uf: 'SP' })
  })

  it('não consulta nada com um CEP incompleto', async () => {
    const buscar = simular({})

    await expect(buscarEnderecoPorCep('0100100')).rejects.toBeInstanceOf(CepNaoEncontradoError)
    expect(buscar).not.toHaveBeenCalled()
  })
})
