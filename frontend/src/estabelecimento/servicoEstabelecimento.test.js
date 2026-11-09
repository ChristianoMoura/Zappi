import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buscarEstabelecimento,
  buscarMarcaLoja,
  DadosInvalidosError,
  LinkEmUsoError,
  ouvirEstabelecimento,
  salvarEstabelecimento,
  ServicoIndisponivelError,
  SessaoExpiradaError,
} from './servicoEstabelecimento'

const doBackend = {
  nome: 'Casa Belt',
  slug: 'casa-belt',
  descricao: 'Confeitaria artesanal: bolos e salgados sob encomenda.',
  whatsapp: '5511900000000',
  emailContato: null,
  cep: null,
  logradouro: null,
  numero: null,
  complemento: null,
  bairro: null,
  cidade: null,
  uf: null,
}

const naTela = { ...doBackend, emailContato: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' }

const LOGO = 'data:image/webp;base64,AAAA'

const json = (status, corpo) => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })

// fetch simulado: responde em ordem e guarda cada chamada
function simularBackend(...respostas) {
  const buscar = vi.fn(async () => respostas.shift() ?? json(500, {}))
  vi.stubGlobal('fetch', buscar)
  return buscar
}

describe('servicoEstabelecimento (ZAP-118)', () => {
  beforeEach(() => {
    sessionStorage.setItem('zappi.sessao', JSON.stringify({ token: 'jwt-de-teste', nome: 'Lídia' }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('lê o estabelecimento com o token e troca os nulos por texto vazio', async () => {
    const buscar = simularBackend(json(200, doBackend))

    await expect(buscarEstabelecimento()).resolves.toEqual({ ...naTela, logo: '', capa: '' })
    const [[endereco, opcoes]] = buscar.mock.calls
    expect(endereco).toBe('/api/estabelecimento')
    expect(opcoes.method).toBe('GET')
    expect(opcoes.headers.Authorization).toBe('Bearer jwt-de-teste')
  })

  it('salva com um PUT só com os campos do banco, sem logo e capa', async () => {
    const buscar = simularBackend(json(200, { ...doBackend, nome: 'Casa Belt Doces' }))

    const salvo = await salvarEstabelecimento({ ...naTela, nome: 'Casa Belt Doces', logo: LOGO, capa: '' })

    expect(salvo).toMatchObject({ nome: 'Casa Belt Doces', cep: '', logo: LOGO, capa: '' })
    const [[endereco, opcoes]] = buscar.mock.calls
    expect(endereco).toBe('/api/estabelecimento')
    expect(opcoes.method).toBe('PUT')
    expect(opcoes.headers['Content-Type']).toBe('application/json')
    const corpo = JSON.parse(opcoes.body)
    expect(corpo).toEqual({ ...naTela, nome: 'Casa Belt Doces' })
    expect(corpo).not.toHaveProperty('logo')
  })

  it('guarda logo e capa neste navegador e os devolve ao ler de novo', async () => {
    simularBackend(json(200, doBackend), json(200, doBackend))

    await salvarEstabelecimento({ ...naTela, logo: LOGO, capa: '' })

    await expect(buscarEstabelecimento()).resolves.toMatchObject({ nome: 'Casa Belt', logo: LOGO, capa: '' })
  })

  it('leva as fotos junto quando o link do cardápio muda', async () => {
    simularBackend(json(200, doBackend), json(200, { ...doBackend, slug: 'casa-belt-doces' }))
    await buscarEstabelecimento()

    await salvarEstabelecimento({ ...naTela, slug: 'casa-belt-doces', logo: LOGO, capa: '' })

    expect(JSON.parse(localStorage.getItem('zappi.fotos-estabelecimento.casa-belt-doces')).logo).toBe(LOGO)
    expect(localStorage.getItem('zappi.fotos-estabelecimento.casa-belt')).toBeNull()
  })

  it('ignora uma cópia das fotos com defeito', async () => {
    localStorage.setItem('zappi.fotos-estabelecimento.casa-belt', '{isto não é json')
    simularBackend(json(200, doBackend))

    await expect(buscarEstabelecimento()).resolves.toMatchObject({ logo: '', capa: '' })
  })

  it('avisa quem mostra a marca da loja quando o estabelecimento é salvo', async () => {
    simularBackend(json(200, { ...doBackend, nome: 'Casa Belt Doces' }))
    const aoMudar = vi.fn()
    const parar = ouvirEstabelecimento(aoMudar)

    await salvarEstabelecimento({ ...naTela, nome: 'Casa Belt Doces', logo: LOGO, capa: '' })
    parar()

    expect(aoMudar).toHaveBeenCalledWith({ nome: 'Casa Belt Doces', logo: LOGO })
  })

  it('link de outro estabelecimento (409) vira LinkEmUsoError', async () => {
    simularBackend(json(409, { codigo: 'LINK_EM_USO', campos: { slug: 'Esse link já é usado por outro estabelecimento. Escolha outro.' } }))

    await expect(salvarEstabelecimento(naTela)).rejects.toBeInstanceOf(LinkEmUsoError)
  })

  it('dados recusados pelo backend (400) trazem a mensagem de cada campo', async () => {
    simularBackend(json(400, { codigo: 'DADOS_INVALIDOS', campos: { cep: 'O CEP tem 8 números. Ex.: 01000-000' } }))

    const erro = await salvarEstabelecimento(naTela).catch((e) => e)

    expect(erro).toBeInstanceOf(DadosInvalidosError)
    expect(erro.campos).toEqual({ cep: 'O CEP tem 8 números. Ex.: 01000-000' })
  })

  it('token vencido (401) encerra a sessão e volta para o login', async () => {
    simularBackend(json(401, { codigo: 'NAO_AUTENTICADO' }))
    const irPara = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign: irPara })

    await expect(buscarEstabelecimento()).rejects.toBeInstanceOf(SessaoExpiradaError)
    expect(sessionStorage.getItem('zappi.sessao')).toBeNull()
    expect(irPara).toHaveBeenCalledWith('/login')
  })

  it('servidor fora do ar ou sem conexão vira ServicoIndisponivelError', async () => {
    simularBackend(json(500, {}))
    await expect(buscarEstabelecimento()).rejects.toBeInstanceOf(ServicoIndisponivelError)

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(buscarEstabelecimento()).rejects.toBeInstanceOf(ServicoIndisponivelError)
  })

  describe('marca da loja', () => {
    it('usa o nome e o logo do Meu estabelecimento', async () => {
      localStorage.setItem('zappi.fotos-estabelecimento.casa-belt', JSON.stringify({ logo: LOGO, capa: '' }))
      simularBackend(json(200, doBackend))

      await expect(buscarMarcaLoja()).resolves.toEqual({ nome: 'Casa Belt', logo: LOGO })
    })

    it('sem login, não chama a API e devolve nulo', async () => {
      sessionStorage.clear()
      const buscar = simularBackend()

      await expect(buscarMarcaLoja()).resolves.toBeNull()
      expect(buscar).not.toHaveBeenCalled()
    })
  })
})
