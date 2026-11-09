import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buscarProduto,
  buscarProdutos,
  excluirProduto,
  ProdutoNaoEncontradoError,
  salvarProduto,
  ServicoIndisponivelError,
  SessaoExpiradaError,
} from './servicoProdutos'

const doBackend = { id: 1, nome: 'Bolo', sabor: 'Brigadeiro de chocolate', unidade: 'KG', preco: 100, descricao: null, foto: null, textoAlternativo: null, ativo: true }
const comFoto = { ...doBackend, foto: 'https://storage.teste/1/1-abcd1234.jpg', textoAlternativo: 'Bolo de brigadeiro' }

const json = (status, corpo) => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })

// fetch simulado: responde em ordem e guarda cada chamada
function simularBackend(...respostas) {
  const buscar = vi.fn(async (endereco) => {
    if (String(endereco).startsWith('blob:')) return new Response(new Blob(['imagem'], { type: 'image/png' }))
    return respostas.shift() ?? json(500, {})
  })
  vi.stubGlobal('fetch', buscar)
  return () => buscar.mock.calls.filter(([endereco]) => !String(endereco).startsWith('blob:'))
}

describe('servicoProdutos (ZAP-39 e ZAP-40)', () => {
  beforeEach(() => {
    sessionStorage.setItem('zappi.sessao', JSON.stringify({ token: 'jwt-de-teste', nome: 'Lídia' }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  it('lista os produtos com o token e troca os nulos por texto vazio', async () => {
    const chamadas = simularBackend(json(200, [doBackend]))

    await expect(buscarProdutos()).resolves.toEqual([{ ...doBackend, descricao: '', foto: '', textoAlternativo: '' }])
    const [[endereco, opcoes]] = chamadas()
    expect(endereco).toBe('/api/produtos')
    expect(opcoes.headers.Authorization).toBe('Bearer jwt-de-teste')
  })

  it('produto inexistente vira ProdutoNaoEncontradoError', async () => {
    simularBackend(json(404, { codigo: 'PRODUTO_NAO_ENCONTRADO' }))

    await expect(buscarProduto(99)).rejects.toBeInstanceOf(ProdutoNaoEncontradoError)
  })

  it('cadastra sem foto com um POST em JSON', async () => {
    const chamadas = simularBackend(json(201, { ...doBackend, id: 7 }))

    const salvo = await salvarProduto({ nome: 'Bolo', sabor: 'Prestígio', unidade: 'KG', preco: 110, descricao: '', foto: '', textoAlternativo: 'sobra' })

    expect(salvo.id).toBe(7)
    const [[endereco, opcoes]] = chamadas()
    expect(endereco).toBe('/api/produtos')
    expect(opcoes.method).toBe('POST')
    expect(JSON.parse(opcoes.body)).toEqual({ nome: 'Bolo', sabor: 'Prestígio', unidade: 'KG', preco: 110, descricao: '', textoAlternativo: '' })
  })

  it('cadastra com foto: cria o produto e depois envia o arquivo com a descrição', async () => {
    const chamadas = simularBackend(json(201, { ...doBackend, id: 7 }), json(200, { ...comFoto, id: 7 }))

    const salvo = await salvarProduto({ nome: 'Bolo', sabor: 'Prestígio', unidade: 'KG', preco: 110, descricao: '', foto: 'blob:foto-nova', textoAlternativo: 'Bolo de prestígio' })

    expect(salvo.foto).toBe(comFoto.foto)
    const [, [endereco, opcoes]] = chamadas()
    expect(endereco).toBe('/api/produtos/7/foto')
    expect(opcoes.method).toBe('POST')
    expect(opcoes.body.get('arquivo')).toBeInstanceOf(Blob)
    expect(opcoes.body.get('textoAlternativo')).toBe('Bolo de prestígio')
    expect(opcoes.headers['Content-Type']).toBeUndefined()
  })

  it('se a foto do cadastro falhar, desfaz o produto criado', async () => {
    const chamadas = simularBackend(json(201, { ...doBackend, id: 7 }), json(503, { codigo: 'FOTO_INDISPONIVEL' }), new Response(null, { status: 204 }))

    await expect(salvarProduto({ nome: 'Bolo', sabor: 'Prestígio', unidade: 'KG', preco: 110, descricao: '', foto: 'blob:foto-nova', textoAlternativo: 'Bolo' }))
      .rejects.toBeInstanceOf(ServicoIndisponivelError)
    const [, , [endereco, opcoes]] = chamadas()
    expect(endereco).toBe('/api/produtos/7')
    expect(opcoes.method).toBe('DELETE')
  })

  it('edita mantendo a foto: só um PUT', async () => {
    const chamadas = simularBackend(json(200, comFoto))

    await salvarProduto({ id: 1, nome: 'Bolo', sabor: 'Brigadeiro de chocolate', unidade: 'KG', preco: 105, descricao: '', foto: comFoto.foto, textoAlternativo: 'Bolo de brigadeiro' })

    expect(chamadas().map(([endereco, opcoes]) => `${opcoes.method} ${endereco}`)).toEqual(['PUT /api/produtos/1'])
  })

  it('edita removendo a foto: tira a foto antes do PUT', async () => {
    const chamadas = simularBackend(json(200, doBackend), json(200, doBackend))

    await salvarProduto({ id: 1, nome: 'Bolo', sabor: 'Brigadeiro de chocolate', unidade: 'KG', preco: 100, descricao: '', foto: '', textoAlternativo: '' })

    expect(chamadas().map(([endereco, opcoes]) => `${opcoes.method} ${endereco}`)).toEqual(['DELETE /api/produtos/1/foto', 'PUT /api/produtos/1'])
  })

  it('edita trocando a foto: PUT e depois o envio da foto nova', async () => {
    const chamadas = simularBackend(json(200, comFoto), json(200, comFoto))

    await salvarProduto({ id: 1, nome: 'Bolo', sabor: 'Brigadeiro de chocolate', unidade: 'KG', preco: 100, descricao: '', foto: 'blob:foto-nova', textoAlternativo: 'Bolo novo' })

    expect(chamadas().map(([endereco, opcoes]) => `${opcoes.method} ${endereco}`)).toEqual(['PUT /api/produtos/1', 'POST /api/produtos/1/foto'])
  })

  it('exclui com DELETE', async () => {
    const chamadas = simularBackend(new Response(null, { status: 204 }))

    await excluirProduto(1)

    const [[endereco, opcoes]] = chamadas()
    expect(`${opcoes.method} ${endereco}`).toBe('DELETE /api/produtos/1')
  })

  it('sem conexão, avisa que o serviço está indisponível', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(buscarProdutos()).rejects.toBeInstanceOf(ServicoIndisponivelError)
  })

  it('com o token vencido, encerra a sessão e volta para o login', async () => {
    const irPara = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign: irPara })
    simularBackend(json(401, {}))

    await expect(buscarProdutos()).rejects.toBeInstanceOf(SessaoExpiradaError)
    expect(sessionStorage.getItem('zappi.sessao')).toBeNull()
    expect(irPara).toHaveBeenCalledWith('/login')
  })
})
