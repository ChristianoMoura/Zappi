import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { buscarTermosVigentes } from '../autenticacao/servicoTermos'
import { buscarCardapio } from '../cardapio/servicoCardapio'
import { renderizarComRotas } from '../testes/renderizarComRotas'
import { PaginaCardapio } from './PaginaCardapio'

// Links para os termos e a privacidade no rodapé do cardápio público (ZAP-148). Como a caixa de
// aceite (ZAP-147), só aparecem quando o backend responde a versão vigente.
vi.mock('../cardapio/servicoCardapio', async (importarOriginal) => ({
  ...(await importarOriginal()),
  buscarCardapio: vi.fn(),
}))
vi.mock('../autenticacao/servicoTermos', async (importarOriginal) => ({
  ...(await importarOriginal()),
  buscarTermosVigentes: vi.fn(),
}))

const CARDAPIO = {
  estabelecimento: { nome: 'Casa Belt', slug: 'casa-belt', descricao: '', whatsapp: '5511900000000', logo: '', capa: '' },
  categorias: [{ id: 1, nome: 'Bolos' }],
  produtos: [{ id: 1, nome: 'Bolo de brigadeiro de chocolate', categoriaId: 1, categoria: 'Bolos', unidade: 'KG', preco: 100, descricao: '', foto: '', textoAlternativo: '' }],
}

const rotas = [
  { path: '/cardapio/:slug/*', Component: PaginaCardapio },
  { path: '/termos', element: <h1>Página dos termos</h1> },
  { path: '/privacidade', element: <h1>Página da privacidade</h1> },
]

describe('rodapé do cardápio com os termos e a privacidade (ZAP-148)', () => {
  beforeEach(() => {
    buscarCardapio.mockResolvedValue(structuredClone(CARDAPIO))
    window.scrollTo = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  test.each([
    ['cardápio', '/cardapio/casa-belt', () => screen.findByRole('heading', { level: 1, name: 'Casa Belt' })],
    ['informações da loja', '/cardapio/casa-belt/informacoes', () => screen.findByRole('region', { name: 'Contato' })],
    ['detalhe do produto', '/cardapio/casa-belt/produto/1', () => screen.findByRole('heading', { level: 2, name: 'Bolo de brigadeiro de chocolate' })],
  ])('no %s, o rodapé tem os dois links', async (_tela, caminho, esperar) => {
    buscarTermosVigentes.mockResolvedValue({ versao: 1, data: '2026-11-17' })
    renderizarComRotas(rotas, caminho)
    await esperar()

    const links = await screen.findByRole('navigation', { name: 'Termos e privacidade' })
    expect(within(links).getByRole('link', { name: 'Termos de uso' })).toHaveAttribute('href', '/termos')
    expect(within(links).getByRole('link', { name: 'Política de privacidade' })).toHaveAttribute('href', '/privacidade')
  })

  test('o link leva à página dos termos', async () => {
    buscarTermosVigentes.mockResolvedValue({ versao: 1, data: '2026-11-17' })
    const usuario = userEvent.setup()
    renderizarComRotas(rotas, '/cardapio/casa-belt')

    const links = await screen.findByRole('navigation', { name: 'Termos e privacidade' })
    await usuario.click(within(links).getByRole('link', { name: 'Termos de uso' }))

    expect(await screen.findByRole('heading', { name: 'Página dos termos' })).toBeVisible()
  })

  test('sem a versão vigente no backend, o rodapé fica só com "feito com o Zappi"', async () => {
    buscarTermosVigentes.mockResolvedValue(null)
    renderizarComRotas(rotas, '/cardapio/casa-belt')

    await screen.findByRole('heading', { level: 1, name: 'Casa Belt' })
    expect(screen.getByText(/Cardápio feito com o/)).toBeVisible()
    expect(screen.queryByRole('navigation', { name: 'Termos e privacidade' })).not.toBeInTheDocument()
  })
})
