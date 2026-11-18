import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { usarTela } from '../testes/pedidosDeTeste'
import { renderizarComRotas } from '../testes/renderizarComRotas'
import { buscarTermosVigentes } from '../autenticacao/servicoTermos'
import { LayoutPrincipal } from './LayoutPrincipal'

// A versão vigente dos termos é simulada; sem ela (nulo), a caixinha da conta fica como antes (ZAP-147)
vi.mock('../autenticacao/servicoTermos', async (importarOriginal) => ({ ...(await importarOriginal()), buscarTermosVigentes: vi.fn(async () => null) }))

const rotas = [
  {
    Component: LayoutPrincipal,
    children: ['/pedidos', '/produtos', '/categorias', '/estabelecimento'].map((caminho) => ({ path: caminho, element: <h1>{caminho}</h1> })),
  },
]

const menu = () => screen.getByRole('navigation', { name: 'Menu principal' })

describe('menu do painel (ZAP-139)', () => {
  afterEach(() => {
    usarTela(false)
    localStorage.clear()
  })

  test('no computador, Produtos é um grupo que abre e fecha, com Produtos e Categorias dentro', async () => {
    const usuario = userEvent.setup()
    usarTela(true)
    renderizarComRotas(rotas, '/categorias')

    const grupo = within(menu()).getByRole('button', { name: 'Produtos' })
    expect(grupo).toHaveAttribute('aria-expanded', 'true')
    expect(within(menu()).getByRole('link', { name: 'Categorias' })).toHaveAttribute('aria-current', 'page')
    expect(within(menu()).getByRole('link', { name: 'Produtos' })).toHaveAttribute('href', '/produtos')

    await usuario.click(grupo)
    expect(grupo).toHaveAttribute('aria-expanded', 'false')

    // A animação de abrir de novo não roda no jsdom; aqui basta o estado do botão
    await usuario.click(grupo)
    expect(grupo).toHaveAttribute('aria-expanded', 'true')
  })

  test('o subitem Produtos leva à lista e fica marcado como a página atual', async () => {
    const usuario = userEvent.setup()
    usarTela(true)
    renderizarComRotas(rotas, '/categorias')

    await usuario.click(within(menu()).getByRole('link', { name: 'Produtos' }))

    expect(await screen.findByRole('heading', { name: '/produtos' })).toBeInTheDocument()
    expect(within(menu()).getByRole('link', { name: 'Produtos' })).toHaveAttribute('aria-current', 'page')
    expect(within(menu()).getByRole('link', { name: 'Categorias' })).not.toHaveAttribute('aria-current')
  })

  test('fora de Produtos, o grupo começa fechado', () => {
    usarTela(true)
    renderizarComRotas(rotas, '/pedidos')

    expect(within(menu()).getByRole('button', { name: 'Produtos' })).toHaveAttribute('aria-expanded', 'false')
  })

  test('com o menu recolhido, o ícone de Produtos abre uma lista com as duas opções', async () => {
    const usuario = userEvent.setup()
    usarTela(true)
    localStorage.setItem('zappi.menu-recolhido', 'true')
    renderizarComRotas(rotas, '/pedidos')

    await usuario.click(within(menu()).getByRole('button', { name: 'Produtos' }))
    const lista = await screen.findByRole('menu')
    await usuario.click(within(lista).getByRole('menuitem', { name: 'Categorias' }))

    expect(await screen.findByRole('heading', { name: '/categorias' })).toBeInTheDocument()
  })

  test('no celular, a barra de baixo continua com três itens, e Produtos fica ativo em Categorias', () => {
    renderizarComRotas(rotas, '/categorias')

    const links = within(menu()).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['Pedidos', 'Produtos', 'Estabelecimento'])
    expect(links[1]).toHaveAttribute('aria-current', 'page')
  })
})

const json = (corpo) => new Response(JSON.stringify(corpo), { status: 200, headers: { 'Content-Type': 'application/json' } })
const loja = (extra = {}) => ({ nome: 'Casa Belt', slug: 'casa-belt', whatsapp: '5511900000000', ...extra })
const topo = () => screen.getByRole('banner')
const botaoConta = () => screen.getByRole('button', { name: 'Minha conta' })

describe('topo com só a marca do Zappi e o logo da loja na conta (ZAP-178)', () => {
  beforeEach(() => {
    sessionStorage.setItem('zappi.sessao', JSON.stringify({ token: 'jwt-de-teste', nome: 'Lídia' }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
    localStorage.clear()
    usarTela(false)
  })

  test('o topo não mostra mais o nome da loja nem o "×"; o logo da loja fica no botão da conta', async () => {
    const logo = 'https://storage.teste/estabelecimentos/1/logo-abcd1234.webp'
    vi.stubGlobal('fetch', vi.fn(async () => json(loja({ logo }))))
    usarTela(true)
    renderizarComRotas(rotas, '/pedidos')

    await waitFor(() => expect(botaoConta().querySelector('img')).toHaveAttribute('src', logo))
    expect(within(topo()).getByRole('img', { name: 'Zappi' })).toBeInTheDocument()
    expect(within(topo()).queryByText('Casa Belt')).not.toBeInTheDocument()
    expect(within(topo()).queryByText('×')).not.toBeInTheDocument()
    // O logo é decorativo: o leitor de tela continua ouvindo só "Minha conta"
    expect(botaoConta().querySelector('img')).toHaveAttribute('alt', '')
  })

  test('sem logo, o botão mostra as iniciais da loja', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(loja())))
    renderizarComRotas(rotas, '/pedidos')

    expect(await within(botaoConta()).findByText('CB')).toHaveAttribute('aria-hidden', 'true')
  })

  test('sem os dados da loja, o botão continua com o ícone de pessoa', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })))
    renderizarComRotas(rotas, '/pedidos')

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(botaoConta().querySelector('svg.tabler-icon-user-circle')).toBeInTheDocument()
    expect(within(botaoConta()).queryByText('CB')).not.toBeInTheDocument()
  })

  test('o menu da conta mostra o logo, o nome da usuária e o da loja, e depois o Sair', async () => {
    const usuario = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn(async () => json(loja())))
    renderizarComRotas(rotas, '/pedidos')
    await within(botaoConta()).findByText('CB')

    await usuario.click(botaoConta())
    const menuConta = await screen.findByRole('menu')

    expect(within(menuConta).getByText('Lídia')).toBeInTheDocument()
    expect(within(menuConta).getByText('Casa Belt')).toBeInTheDocument()
    expect(within(menuConta).getByText('CB')).toBeInTheDocument()
    expect(within(menuConta).getByRole('menuitem', { name: 'Sair' })).toBeInTheDocument()
    expect(botaoConta()).toHaveAttribute('aria-expanded', 'true')
  })
})

describe('termos no rodapé da caixinha da conta (ZAP-147)', () => {
  beforeEach(() => {
    sessionStorage.setItem('zappi.sessao', JSON.stringify({ token: 'jwt-de-teste', nome: 'Lídia' }))
    vi.stubGlobal('fetch', vi.fn(async () => json(loja())))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
    buscarTermosVigentes.mockReset().mockImplementation(async () => null)
  })

  async function abrirConta(usuario) {
    renderizarComRotas(rotas, '/pedidos')
    await within(botaoConta()).findByText('CB')
    await usuario.click(botaoConta())
    return screen.findByRole('menu')
  }

  test('sem os termos no backend, a caixinha termina no Sair', async () => {
    const menuConta = await abrirConta(userEvent.setup())
    expect(within(menuConta).queryByRole('menuitem', { name: 'Termos de uso' })).not.toBeInTheDocument()
  })

  test('com os termos, os dois links ficam depois do Sair, chegam pelas setas e o Esc fecha', async () => {
    const usuario = userEvent.setup()
    buscarTermosVigentes.mockResolvedValue({ versao: 1, data: '2026-11-14' })
    const menuConta = await abrirConta(usuario)

    await within(menuConta).findByRole('menuitem', { name: 'Termos de uso' })
    const itens = within(menuConta).getAllByRole('menuitem')
    expect(itens.map((item) => item.textContent)).toEqual(['Sair', 'Termos de uso', 'Política de privacidade'])
    expect(itens[1]).toHaveAttribute('href', '/termos')
    expect(itens[2]).toHaveAttribute('href', '/privacidade')

    itens[0].focus()
    await usuario.keyboard('{ArrowDown}')
    expect(itens[1]).toHaveFocus()
    await usuario.keyboard('{ArrowDown}')
    expect(itens[2]).toHaveFocus()

    await usuario.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
  })

  test('cada link abre a página na mesma aba, e o ponto entre eles fica fora do leitor de tela (ZAP-149)', async () => {
    const usuario = userEvent.setup()
    buscarTermosVigentes.mockResolvedValue({ versao: 1, data: '2026-11-14' })
    const roteador = renderizarComRotas(
      [...rotas, ...['/termos', '/privacidade'].map((caminho) => ({ path: caminho, element: <h1>{caminho}</h1> }))],
      '/pedidos',
    )

    for (const [nome, caminho] of [['Termos de uso', '/termos'], ['Política de privacidade', '/privacidade']]) {
      await roteador.navigate('/pedidos')
      await within(await screen.findByRole('button', { name: 'Minha conta' })).findByText('CB')
      await usuario.click(botaoConta())
      const menuConta = await screen.findByRole('menu')
      const link = await within(menuConta).findByRole('menuitem', { name: nome })
      expect(link).not.toHaveAttribute('target')
      expect(within(menuConta).getByText('·')).toHaveAttribute('aria-hidden', 'true')

      await usuario.click(link)

      expect(roteador.state.location.pathname).toBe(caminho)
      expect(await screen.findByRole('heading', { name: caminho })).toBeVisible()
    }
  })
})
