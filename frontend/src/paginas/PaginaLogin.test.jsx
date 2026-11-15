import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
  CredenciaisInvalidasError,
  entrarNoServidor,
  LoginBloqueadoError,
  ServicoIndisponivelError,
  TermosPendentesError,
} from '../autenticacao/servicoAutenticacao'
import { buscarTermosVigentes } from '../autenticacao/servicoTermos'
import { renderizarComRotas } from '../testes/renderizarComRotas'
import { PaginaLogin } from './PaginaLogin'

import { buscarMarcaLoja } from '../estabelecimento/servicoEstabelecimento'

// O backend é simulado aqui para os testes não dependerem da ZAP-31
vi.mock('../autenticacao/servicoAutenticacao', async (importarOriginal) => ({
  ...(await importarOriginal()),
  entrarNoServidor: vi.fn(),
}))

// A versão vigente dos termos é simulada; sem ela (nulo), a tela fica como antes (ZAP-147)
vi.mock('../autenticacao/servicoTermos', async (importarOriginal) => ({
  ...(await importarOriginal()),
  buscarTermosVigentes: vi.fn(),
}))

// A marca da loja no login ainda não vem da API (sem token, a loja não é conhecida; ZAP-118)
vi.mock('../estabelecimento/servicoEstabelecimento', async (importarOriginal) => ({
  ...(await importarOriginal()),
  buscarMarcaLoja: vi.fn(),
}))

function abrirLogin() {
  return renderizarComRotas(
    [
      { path: '/login', Component: PaginaLogin },
      { path: '/pedidos', element: <h1>Pedidos</h1> },
    ],
    '/login',
  )
}

async function preencherEEntrar(usuario, email = 'lidia@casabelt.com', senha = 'senha-de-teste') {
  if (email) await usuario.type(screen.getByLabelText('E-mail'), email)
  if (senha) await usuario.type(screen.getByLabelText('Senha'), senha)
  await usuario.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('PaginaLogin (US1, RF01, RF02)', () => {
  beforeEach(() => {
    entrarNoServidor.mockReset()
    buscarTermosVigentes.mockReset().mockResolvedValue(null)
    localStorage.clear()
    buscarMarcaLoja.mockReset().mockResolvedValue({ nome: 'Casa Belt', logo: 'logo.webp' })
  })

  test('mostra os campos com rótulo visível (NBR 17225 5.3.1)', () => {
    abrirLogin()

    expect(screen.getByLabelText('E-mail')).toBeVisible()
    expect(screen.getByLabelText('Senha')).toBeVisible()
  })

  test('mostra o logo da loja, o mesmo do Estabelecimento, com o Zappi embaixo', async () => {
    abrirLogin()

    expect(await screen.findByRole('img', { name: 'Logo de Casa Belt' })).toBeVisible()
    expect(screen.getByRole('img', { name: 'Zappi' })).toBeVisible()
  })

  test('sem a marca da loja, mostra só o Zappi', async () => {
    buscarMarcaLoja.mockResolvedValue(null)
    abrirLogin()

    await waitFor(() => expect(buscarMarcaLoja).toHaveBeenCalled())
    expect(screen.getByRole('img', { name: 'Zappi' })).toBeVisible()
    expect(screen.queryByRole('img', { name: /Logo de/ })).not.toBeInTheDocument()
  })

  test('pede o e-mail e a senha sem chamar o servidor', async () => {
    const usuario = userEvent.setup()
    abrirLogin()

    await preencherEEntrar(usuario, '', '')

    expect(screen.getByText('Digite seu e-mail.')).toBeVisible()
    expect(screen.getByText('Digite sua senha.')).toBeVisible()
    expect(entrarNoServidor).not.toHaveBeenCalled()
  })

  test('recusa e-mail em formato inválido', async () => {
    const usuario = userEvent.setup()
    abrirLogin()

    await preencherEEntrar(usuario, 'lidia')

    expect(screen.getByText('E-mail inválido.')).toBeVisible()
    expect(entrarNoServidor).not.toHaveBeenCalled()
  })

  test('com credenciais válidas, salva a sessão e abre os pedidos', async () => {
    const usuario = userEvent.setup()
    entrarNoServidor.mockResolvedValue({ token: 'token-de-teste', nome: 'Lídia' })
    const roteador = abrirLogin()

    await preencherEEntrar(usuario)

    await waitFor(() => expect(roteador.state.location.pathname).toBe('/pedidos'))
    expect(JSON.parse(sessionStorage.getItem('zappi.sessao'))).toEqual({ token: 'token-de-teste', nome: 'Lídia' })
  })

  test.each([
    [new CredenciaisInvalidasError(), 'E-mail ou senha incorretos. Confira e tente novamente.'],
    [new LoginBloqueadoError(), 'Muitas tentativas sem sucesso. Espere 15 minutos e tente novamente.'],
    [new ServicoIndisponivelError(), 'Não foi possível entrar agora. Tente novamente em alguns minutos.'],
  ])('avisa em linguagem simples, limpa a senha e não abre a sessão (%o)', async (erro, mensagem) => {
    const usuario = userEvent.setup()
    entrarNoServidor.mockRejectedValue(erro)
    abrirLogin()

    await preencherEEntrar(usuario)

    expect(await screen.findByRole('alert')).toHaveTextContent(mensagem)
    expect(screen.getByLabelText('Senha')).toHaveValue('')
    expect(sessionStorage.getItem('zappi.sessao')).toBeNull()
  })
})

describe('aceite dos termos no login (ZAP-143, ZAP-147)', () => {
  const caixa = () => screen.getByRole('checkbox', { name: /Li e concordo com os Termos de uso e a Política de privacidade/ })

  beforeEach(() => {
    entrarNoServidor.mockReset().mockResolvedValue({ token: 'token-de-teste', nome: 'Lídia' })
    buscarMarcaLoja.mockReset().mockResolvedValue(null)
    buscarTermosVigentes.mockReset().mockResolvedValue({ versao: 1, data: '2026-11-14' })
    localStorage.clear()
    sessionStorage.clear()
  })

  test('sem os termos no backend, não mostra a caixa nem os links, e entra como antes', async () => {
    const usuario = userEvent.setup()
    buscarTermosVigentes.mockResolvedValue(null)
    abrirLogin()

    await preencherEEntrar(usuario)

    await waitFor(() => expect(entrarNoServidor).toHaveBeenCalledWith('lidia@casabelt.com', 'senha-de-teste', null))
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Termos de uso' })).not.toBeInTheDocument()
  })

  test('mostra a caixa com rótulo visível e os links dos dois textos, também no rodapé', async () => {
    abrirLogin()

    expect(await screen.findByRole('checkbox', { name: /Li e concordo/ })).not.toBeChecked()
    expect(caixa()).toHaveAccessibleDescription(/Versão 1/)
    const rodape = screen.getByRole('navigation', { name: 'Termos e privacidade' })
    expect(within(rodape).getByRole('link', { name: 'Termos de uso' })).toHaveAttribute('href', '/termos')
    expect(within(rodape).getByRole('link', { name: 'Política de privacidade' })).toHaveAttribute('href', '/privacidade')
    expect(screen.getAllByRole('link', { name: 'Termos de uso' })).toHaveLength(2)
  })

  test('sem marcar a caixa, explica o motivo, leva o foco a ela e não chama o servidor', async () => {
    const usuario = userEvent.setup()
    abrirLogin()
    await screen.findByRole('checkbox', { name: /Li e concordo/ })

    await preencherEEntrar(usuario)

    expect(entrarNoServidor).not.toHaveBeenCalled()
    expect(caixa()).toHaveFocus()
    expect(caixa()).toHaveAccessibleDescription(/Para entrar, marque que leu e concorda/)
  })

  test('com a caixa marcada, o aceite vai junto do login e o aparelho guarda a versão', async () => {
    const usuario = userEvent.setup()
    const roteador = abrirLogin()
    await usuario.click(await screen.findByRole('checkbox', { name: /Li e concordo/ }))

    await preencherEEntrar(usuario)

    await waitFor(() => expect(roteador.state.location.pathname).toBe('/pedidos'))
    expect(entrarNoServidor).toHaveBeenCalledWith('lidia@casabelt.com', 'senha-de-teste', { versao: 1 })
    expect(localStorage.getItem('zappi.termos-aceitos')).toBe('1')
  })

  test('com o lembrete da versão vigente, a caixa não aparece de novo', async () => {
    const usuario = userEvent.setup()
    localStorage.setItem('zappi.termos-aceitos', '1')
    abrirLogin()
    await screen.findByRole('navigation', { name: 'Termos e privacidade' })

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    await preencherEEntrar(usuario)
    await waitFor(() => expect(entrarNoServidor).toHaveBeenCalledWith('lidia@casabelt.com', 'senha-de-teste', null))
  })

  test('com a versão nova, a caixa volta', async () => {
    localStorage.setItem('zappi.termos-aceitos', '1')
    buscarTermosVigentes.mockResolvedValue({ versao: 2, data: '2026-12-01' })
    abrirLogin()

    expect(await screen.findByRole('checkbox', { name: /Li e concordo/ })).toHaveAccessibleDescription(/Versão 2/)
  })

  test('se o backend pedir o aceite (TERMOS_PENDENTES), a caixa aparece com o foco e a senha continua', async () => {
    const usuario = userEvent.setup()
    localStorage.setItem('zappi.termos-aceitos', '1')
    entrarNoServidor.mockRejectedValueOnce(new TermosPendentesError())
    abrirLogin()
    await screen.findByRole('navigation', { name: 'Termos e privacidade' })

    await preencherEEntrar(usuario)

    await waitFor(() => expect(caixa()).toHaveFocus())
    expect(caixa()).toHaveAccessibleDescription(/ainda não foram aceitos neste aparelho ou mudaram/)
    expect(screen.getByLabelText('Senha')).toHaveValue('senha-de-teste')
    expect(sessionStorage.getItem('zappi.sessao')).toBeNull()

    await usuario.click(caixa())
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))
    await waitFor(() => expect(entrarNoServidor).toHaveBeenLastCalledWith('lidia@casabelt.com', 'senha-de-teste', { versao: 1 }))
  })
})
