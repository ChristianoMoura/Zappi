import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
  CredenciaisInvalidasError,
  entrarNoServidor,
  LoginBloqueadoError,
  ServicoIndisponivelError,
} from '../autenticacao/servicoAutenticacao'
import { renderizarComRotas } from '../testes/renderizarComRotas'
import { PaginaLogin } from './PaginaLogin'

import { buscarMarcaLoja } from '../estabelecimento/servicoEstabelecimento'

// O backend é simulado aqui para os testes não dependerem da ZAP-31
vi.mock('../autenticacao/servicoAutenticacao', async (importarOriginal) => ({
  ...(await importarOriginal()),
  entrarNoServidor: vi.fn(),
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
    buscarMarcaLoja.mockReset().mockResolvedValue({ nome: 'Casa Belt', logo: 'logo.webp' })
  })

  test('mostra os campos com rótulo visível (NBR 17225 5.3.1)', () => {
    abrirLogin()

    expect(screen.getByLabelText('E-mail')).toBeVisible()
    expect(screen.getByLabelText('Senha')).toBeVisible()
  })

  test('mostra o logo da loja, o mesmo do Meu estabelecimento, com o Zappi embaixo', async () => {
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
