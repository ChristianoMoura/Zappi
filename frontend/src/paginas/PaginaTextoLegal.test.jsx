import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { renderizarComRotas } from '../testes/renderizarComRotas'
import { PaginaTextoLegal } from './PaginaTextoLegal'

// Páginas /termos e /privacidade (ZAP-148). O último aceite vem de
// GET /api/autenticacao/termos-aceitos, simulado com fetch.

const rotas = [
  { path: '/termos', element: <PaginaTextoLegal documento="termos" /> },
  { path: '/privacidade', element: <PaginaTextoLegal documento="privacidade" /> },
  { path: '/pedidos', element: <h1>Quadro de pedidos</h1> },
  { path: '/cardapio/casa-belt', element: <a href="/termos">Abrir os termos</a> },
]

function entrarComoLidia() {
  sessionStorage.setItem('zappi.sessao', JSON.stringify({ token: 'token-de-teste', nome: 'Lídia' }))
}

function respostaDoAceite(status, corpo) {
  const fetchSimulado = vi.fn(async () => ({ status, ok: status < 300, json: async () => corpo }))
  vi.stubGlobal('fetch', fetchSimulado)
  return fetchSimulado
}

describe('páginas de termos e privacidade (ZAP-148)', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  test('sem login, /termos mostra o texto com a versão e a data no topo, sem "Voltar ao painel"', async () => {
    const fetchSimulado = respostaDoAceite(200, { versao: 1, aceitoEm: '2026-11-17T21:30:00Z' })
    renderizarComRotas(rotas, '/termos')

    expect(await screen.findByRole('heading', { level: 1, name: 'Termos e condições de uso do Zappi' })).toBeVisible()
    expect(screen.getByText(/Versão 1 · Última alteração: 17 de novembro de 2026/)).toBeVisible()
    expect(screen.getByRole('heading', { level: 2, name: '8. Pedidos pelo Cardápio' })).toBeVisible()
    expect(screen.getByRole('img', { name: 'Zappi' })).toBeVisible()
    expect(screen.queryByRole('link', { name: /Voltar ao painel/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/Você aceitou a versão/)).not.toBeInTheDocument()
    // Sem login, nem pergunta o aceite ao servidor
    expect(fetchSimulado).not.toHaveBeenCalled()
    expect(document.title).toBe('Termos de uso · Zappi')
  })

  test('sem login, /privacidade também abre, com a versão e a data no topo (ZAP-149)', async () => {
    const fetchSimulado = respostaDoAceite(200, { versao: 1, aceitoEm: '2026-11-17T21:30:00Z' })
    renderizarComRotas(rotas, '/privacidade')

    expect(await screen.findByRole('heading', { level: 1, name: 'Política de privacidade do Zappi' })).toBeVisible()
    expect(screen.getByText(/Versão 1 · Última alteração: 17 de novembro de 2026/)).toBeVisible()
    expect(screen.queryByRole('link', { name: /Voltar ao painel/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/Você aceitou a versão/)).not.toBeInTheDocument()
    expect(fetchSimulado).not.toHaveBeenCalled()
    expect(document.title).toBe('Política de privacidade · Zappi')
  })

  test('sem página anterior, não mostra o "Voltar"; vindo de outra página, ele volta para ela', async () => {
    respostaDoAceite(204, null)
    const usuario = userEvent.setup()
    const roteador = renderizarComRotas(rotas, '/privacidade')
    expect(await screen.findByRole('heading', { level: 1, name: 'Política de privacidade do Zappi' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Voltar' })).not.toBeInTheDocument()

    await roteador.navigate('/cardapio/casa-belt')
    await roteador.navigate('/termos')
    await usuario.click(await screen.findByRole('button', { name: 'Voltar' }))

    expect(roteador.state.location.pathname).toBe('/cardapio/casa-belt')
  })

  test('com a Lídia logada, mostra quando ela aceitou e leva de volta ao painel', async () => {
    entrarComoLidia()
    const fetchSimulado = respostaDoAceite(200, { versao: 1, aceitoEm: '2026-11-17T21:30:00Z' })
    const usuario = userEvent.setup()
    renderizarComRotas(rotas, '/privacidade')

    expect(await screen.findByText('Você aceitou a versão 1 em 17/11/2026.')).toBeVisible()
    expect(fetchSimulado).toHaveBeenCalledWith('/api/autenticacao/termos-aceitos', { headers: { Authorization: 'Bearer token-de-teste' } })

    await usuario.click(screen.getByRole('link', { name: 'Voltar ao painel' }))
    expect(await screen.findByRole('heading', { name: 'Quadro de pedidos' })).toBeVisible()
  })

  test('a data do aceite segue o horário de São Paulo', async () => {
    entrarComoLidia()
    // 01h de 18/11 em UTC ainda é 17/11 em São Paulo
    respostaDoAceite(200, { versao: 2, aceitoEm: '2026-11-18T01:00:00Z' })
    renderizarComRotas(rotas, '/termos')

    expect(await screen.findByText('Você aceitou a versão 2 em 17/11/2026.')).toBeVisible()
  })

  test.each([
    ['sem aceite (204)', 204, null],
    ['token vencido (401)', 401, { codigo: 'NAO_AUTENTICADO' }],
  ])('logada, %s: só não mostra a frase, sem sair da página', async (_caso, status, corpo) => {
    entrarComoLidia()
    respostaDoAceite(status, corpo)
    const roteador = renderizarComRotas(rotas, '/termos')

    expect(await screen.findByRole('link', { name: 'Voltar ao painel' })).toBeVisible()
    expect(screen.queryByText(/Você aceitou a versão/)).not.toBeInTheDocument()
    expect(roteador.state.location.pathname).toBe('/termos')
  })

  test('o link para a política dentro dos termos abre a página /privacidade', async () => {
    respostaDoAceite(204, null)
    const usuario = userEvent.setup()
    const roteador = renderizarComRotas(rotas, '/termos')

    const adesao = (await screen.findByRole('heading', { level: 2, name: '2. Adesão a estes Termos de Uso' })).parentElement
    await usuario.click(within(adesao).getAllByRole('link', { name: 'Política de privacidade' })[0])

    expect(roteador.state.location.pathname).toBe('/privacidade')
    expect(await screen.findByRole('heading', { level: 1, name: 'Política de privacidade do Zappi' })).toBeVisible()
  })

  test('o link para fora (ANPD) abre em outra aba e avisa o leitor de tela', async () => {
    respostaDoAceite(204, null)
    renderizarComRotas(rotas, '/privacidade')

    const anpd = await screen.findByRole('link', { name: /gov\.br\/anpd/ })
    expect(anpd).toHaveAttribute('href', 'https://www.gov.br/anpd')
    expect(anpd).toHaveAttribute('target', '_blank')
    expect(anpd).toHaveTextContent('gov.br/anpd (abre em outra aba)')
  })
})
