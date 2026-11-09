import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buscarEstabelecimento,
  buscarMarcaLoja,
  DadosInvalidosError,
  FotoNaoEnviadaError,
  LinkEmUsoError,
  ouvirEstabelecimento,
  salvarEstabelecimento,
  ServicoIndisponivelError,
  SessaoExpiradaError,
} from './servicoEstabelecimento'

const LOGO = 'https://storage.teste/estabelecimentos/1/logo-abcd1234.webp'
const CAPA = 'https://storage.teste/estabelecimentos/1/capa-abcd1234.jpg'

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
  logo: null,
  capa: null,
}

const naTela = {
  ...doBackend,
  emailContato: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', logo: '', capa: '',
}

// Só os campos de texto, como vão no PUT
const { logo: _logo, capa: _capa, ...textoNaTela } = naTela

const json = (status, corpo) => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })

// fetch simulado: responde em ordem e guarda cada chamada. A foto escolhida na tela (blob:) é
// lida como arquivo, sem passar pela fila de respostas.
function simularBackend(...respostas) {
  const buscar = vi.fn(async (endereco) => {
    if (String(endereco).startsWith('blob:')) return { blob: async () => new Blob(['imagem'], { type: 'image/png' }) }
    return respostas.shift() ?? json(500, {})
  })
  vi.stubGlobal('fetch', buscar)
  return () => buscar.mock.calls.filter(([endereco]) => !String(endereco).startsWith('blob:'))
}

describe('servicoEstabelecimento (ZAP-118 e ZAP-120)', () => {
  beforeEach(() => {
    sessionStorage.setItem('zappi.sessao', JSON.stringify({ token: 'jwt-de-teste', nome: 'Lídia' }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lê o estabelecimento com o token, com o logo e a capa da API, e troca os nulos por texto vazio', async () => {
    const chamadas = simularBackend(json(200, { ...doBackend, logo: LOGO }))

    await expect(buscarEstabelecimento()).resolves.toEqual({ ...naTela, logo: LOGO })
    const [[endereco, opcoes]] = chamadas()
    expect(endereco).toBe('/api/estabelecimento')
    expect(opcoes.method).toBe('GET')
    expect(opcoes.headers.Authorization).toBe('Bearer jwt-de-teste')
  })

  it('sem foto nova, salva só com um PUT dos campos de texto', async () => {
    const chamadas = simularBackend(json(200, { ...doBackend, nome: 'Casa Belt Doces', logo: LOGO }))

    const salvo = await salvarEstabelecimento({ ...naTela, nome: 'Casa Belt Doces', logo: LOGO })

    expect(salvo).toMatchObject({ nome: 'Casa Belt Doces', cep: '', logo: LOGO })
    expect(chamadas()).toHaveLength(1)
    const [[endereco, opcoes]] = chamadas()
    expect(endereco).toBe('/api/estabelecimento')
    expect(opcoes.method).toBe('PUT')
    expect(opcoes.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(opcoes.body)).toEqual({ ...textoNaTela, nome: 'Casa Belt Doces' })
  })

  it('com logo e capa novos, salva os dados e depois envia cada foto', async () => {
    const chamadas = simularBackend(
      json(200, doBackend),
      json(200, { ...doBackend, logo: LOGO }),
      json(200, { ...doBackend, logo: LOGO, capa: CAPA }),
    )

    const salvo = await salvarEstabelecimento({ ...naTela, logo: 'blob:logo-novo', capa: 'blob:capa-nova' })

    expect(salvo).toMatchObject({ logo: LOGO, capa: CAPA })
    const [, [enderecoLogo, opcoesLogo], [enderecoCapa, opcoesCapa]] = chamadas()
    expect(enderecoLogo).toBe('/api/estabelecimento/logo')
    expect(opcoesLogo.method).toBe('POST')
    expect(opcoesLogo.headers.Authorization).toBe('Bearer jwt-de-teste')
    expect(opcoesLogo.headers['Content-Type']).toBeUndefined()
    expect(opcoesLogo.body.get('arquivo')).toBeInstanceOf(Blob)
    expect(enderecoCapa).toBe('/api/estabelecimento/capa')
    expect(opcoesCapa.body.get('arquivo')).toBeInstanceOf(Blob)
  })

  it('tira a foto que a tela apagou', async () => {
    const chamadas = simularBackend(json(200, { ...doBackend, capa: CAPA }), json(200, doBackend))

    const salvo = await salvarEstabelecimento({ ...naTela, capa: '' })

    expect(salvo.capa).toBe('')
    const [, [endereco, opcoes]] = chamadas()
    expect(endereco).toBe('/api/estabelecimento/capa')
    expect(opcoes.method).toBe('DELETE')
  })

  it('foto recusada pelo backend: os dados ficam salvos e a mensagem explica o motivo', async () => {
    simularBackend(
      json(200, { ...doBackend, nome: 'Casa Belt Doces' }),
      json(400, { codigo: 'DADOS_INVALIDOS', campos: { arquivo: 'A foto pode ter até 5 MB.' } }),
    )

    const erro = await salvarEstabelecimento({ ...naTela, nome: 'Casa Belt Doces', logo: 'blob:logo-grande' }).catch((e) => e)

    expect(erro).toBeInstanceOf(FotoNaoEnviadaError)
    expect(erro.message).toBe('Os dados foram salvos, mas o logo não foi enviado. A foto pode ter até 5 MB.')
    expect(erro.salvo).toMatchObject({ nome: 'Casa Belt Doces', logo: '' })
  })

  it('Storage fora do ar: avisa que a capa não foi enviada e mantém o logo já enviado', async () => {
    simularBackend(
      json(200, doBackend),
      json(200, { ...doBackend, logo: LOGO }),
      json(503, { codigo: 'FOTO_INDISPONIVEL' }),
    )

    const erro = await salvarEstabelecimento({ ...naTela, logo: 'blob:logo', capa: 'blob:capa' }).catch((e) => e)

    expect(erro).toBeInstanceOf(FotoNaoEnviadaError)
    expect(erro.message).toBe('Os dados foram salvos, mas a foto de capa não foi enviada. Tente de novo em alguns minutos.')
    expect(erro.salvo).toMatchObject({ logo: LOGO, capa: '' })
  })

  it('avisa quem mostra a marca da loja com o logo que ficou no servidor', async () => {
    simularBackend(json(200, { ...doBackend, nome: 'Casa Belt Doces' }), json(200, { ...doBackend, nome: 'Casa Belt Doces', logo: LOGO }))
    const aoMudar = vi.fn()
    const parar = ouvirEstabelecimento(aoMudar)

    await salvarEstabelecimento({ ...naTela, nome: 'Casa Belt Doces', logo: 'blob:logo-novo' })
    parar()

    expect(aoMudar).toHaveBeenCalledWith({ nome: 'Casa Belt Doces', logo: LOGO })
  })

  it('link de outro estabelecimento (409) vira LinkEmUsoError e não envia as fotos', async () => {
    const chamadas = simularBackend(json(409, { codigo: 'LINK_EM_USO' }))

    await expect(salvarEstabelecimento({ ...naTela, logo: 'blob:logo' })).rejects.toBeInstanceOf(LinkEmUsoError)
    expect(chamadas()).toHaveLength(1)
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

  it('apaga a cópia antiga das fotos que ficava no navegador (ZAP-118)', async () => {
    localStorage.setItem('zappi.fotos-estabelecimento.casa-belt', JSON.stringify({ logo: 'data:image/webp;base64,AAAA' }))
    localStorage.setItem('outra-chave', 'fica')
    vi.resetModules()

    await import('./servicoEstabelecimento')

    expect(localStorage.getItem('zappi.fotos-estabelecimento.casa-belt')).toBeNull()
    expect(localStorage.getItem('outra-chave')).toBe('fica')
    localStorage.clear()
  })

  describe('marca da loja', () => {
    it('usa o nome e o logo do Meu estabelecimento', async () => {
      simularBackend(json(200, { ...doBackend, logo: LOGO }))

      await expect(buscarMarcaLoja()).resolves.toEqual({ nome: 'Casa Belt', logo: LOGO })
    })

    it('sem login, não chama a API e devolve nulo', async () => {
      sessionStorage.clear()
      const chamadas = simularBackend()

      await expect(buscarMarcaLoja()).resolves.toBeNull()
      expect(chamadas()).toHaveLength(0)
    })
  })
})
