import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CredenciaisInvalidasError,
  entrarNoServidor,
  LoginBloqueadoError,
  ServicoIndisponivelError,
  TermosPendentesError,
} from './servicoAutenticacao'

function respostaJson(status, corpo) {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('entrarNoServidor', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('envia e-mail e senha para a rota de login e devolve o token e o nome', async () => {
    const buscar = vi.fn().mockResolvedValue(respostaJson(200, { token: 'jwt', nome: 'Lídia' }))
    vi.stubGlobal('fetch', buscar)

    await expect(entrarNoServidor('lidia@casabelt.com', 'segredo')).resolves.toEqual({ token: 'jwt', nome: 'Lídia' })
    expect(buscar).toHaveBeenCalledWith('/api/autenticacao/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'lidia@casabelt.com', senha: 'segredo' }),
    })
  })

  it('com o aceite dos termos, envia a versão aceita junto do login (ZAP-147)', async () => {
    const buscar = vi.fn().mockResolvedValue(respostaJson(200, { token: 'jwt', nome: 'Lídia' }))
    vi.stubGlobal('fetch', buscar)

    await entrarNoServidor('lidia@casabelt.com', 'segredo', { versao: 2 })
    expect(JSON.parse(buscar.mock.calls[0][1].body)).toEqual({ email: 'lidia@casabelt.com', senha: 'segredo', aceiteTermos: true, versaoTermos: 2 })
  })

  it('TERMOS_PENDENTES vira um erro próprio, para a tela pedir o aceite (ZAP-147)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson(403, { codigo: 'TERMOS_PENDENTES', mensagem: 'Aceite os termos.' })))
    await expect(entrarNoServidor('lidia@casabelt.com', 'segredo')).rejects.toBeInstanceOf(TermosPendentesError)
  })

  it.each([
    [401, { codigo: 'CREDENCIAIS_INVALIDAS', mensagem: 'E-mail ou senha incorretos.' }, CredenciaisInvalidasError],
    [400, { codigo: 'DADOS_INVALIDOS', mensagem: 'Confira os dados informados.' }, CredenciaisInvalidasError],
    [429, { codigo: 'LOGIN_BLOQUEADO', mensagem: 'Muitas tentativas.' }, LoginBloqueadoError],
    [500, { codigo: 'ERRO', mensagem: 'Erro.' }, ServicoIndisponivelError],
  ])('com status %i, lança o erro certo', async (status, corpo, ErroEsperado) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson(status, corpo)))

    await expect(entrarNoServidor('lidia@casabelt.com', 'segredo')).rejects.toBeInstanceOf(ErroEsperado)
  })

  it('sem conexão com o servidor, avisa que o serviço está indisponível', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(entrarNoServidor('lidia@casabelt.com', 'segredo')).rejects.toBeInstanceOf(ServicoIndisponivelError)
  })

  it('com resposta sem token, avisa que o serviço está indisponível', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 200 })))

    await expect(entrarNoServidor('lidia@casabelt.com', 'segredo')).rejects.toBeInstanceOf(ServicoIndisponivelError)
  })
})
