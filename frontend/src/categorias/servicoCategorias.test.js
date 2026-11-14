import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buscarCategorias, CategoriaRecusadaError, excluirCategoria, reordenarCategorias, salvarCategoria, ServicoIndisponivelError } from './servicoCategorias'

const json = (status, corpo) => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })
const bolos = { id: 1, nome: 'Bolos' }
const salgados = { id: 2, nome: 'Salgados' }

function simularBackend(...respostas) {
  const buscar = vi.fn(async () => respostas.shift() ?? json(500, {}))
  vi.stubGlobal('fetch', buscar)
  return buscar
}

describe('servicoCategorias (ZAP-139)', () => {
  beforeEach(() => {
    sessionStorage.setItem('zappi.sessao', JSON.stringify({ token: 'jwt-de-teste', nome: 'Lídia' }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  it('lista as categorias na ordem da Lídia, com o token', async () => {
    const buscar = simularBackend(json(200, [bolos, salgados]))

    await expect(buscarCategorias()).resolves.toEqual([bolos, salgados])
    const [endereco, opcoes] = buscar.mock.calls[0]
    expect(endereco).toBe('/api/categorias')
    expect(opcoes.headers.Authorization).toBe('Bearer jwt-de-teste')
  })

  it('cria com POST e renomeia com PUT', async () => {
    const buscar = simularBackend(json(201, { id: 3, nome: 'Doces finos' }), json(200, { ...bolos, nome: 'Bolos de festa' }))

    await salvarCategoria({ nome: 'Doces finos' })
    await salvarCategoria({ id: 1, nome: 'Bolos de festa' })

    expect(buscar.mock.calls.map(([endereco, opcoes]) => `${opcoes.method} ${endereco}`)).toEqual(['POST /api/categorias', 'PUT /api/categorias/1'])
    expect(JSON.parse(buscar.mock.calls[0][1].body)).toEqual({ nome: 'Doces finos' })
  })

  it('manda a nova ordem com todos os ids', async () => {
    const buscar = simularBackend(json(200, [salgados, bolos]))

    await expect(reordenarCategorias([2, 1])).resolves.toEqual([salgados, bolos])
    const [endereco, opcoes] = buscar.mock.calls[0]
    expect(`${opcoes.method} ${endereco}`).toBe('PUT /api/categorias/ordem')
    expect(JSON.parse(opcoes.body)).toEqual({ ids: [2, 1] })
  })

  it('nome repetido ou categoria com produto viram CategoriaRecusadaError com a mensagem do backend', async () => {
    simularBackend(json(409, { codigo: 'CATEGORIA_COM_PRODUTOS', mensagem: 'Mova os produtos desta categoria antes de excluí-la.' }))

    const erro = await excluirCategoria(1).catch((e) => e)
    expect(erro).toBeInstanceOf(CategoriaRecusadaError)
    expect(erro.message).toBe('Mova os produtos desta categoria antes de excluí-la.')
  })

  it('erro do servidor vira ServicoIndisponivelError', async () => {
    simularBackend(json(500, {}))

    await expect(buscarCategorias()).rejects.toBeInstanceOf(ServicoIndisponivelError)
  })
})
