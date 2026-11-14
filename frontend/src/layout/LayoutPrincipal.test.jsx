import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test } from 'vitest'
import { usarTela } from '../testes/pedidosDeTeste'
import { renderizarComRotas } from '../testes/renderizarComRotas'
import { LayoutPrincipal } from './LayoutPrincipal'

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
    expect(links.map((l) => l.textContent)).toEqual(['Pedidos', 'Produtos', 'Meu estabelecimento'])
    expect(links[1]).toHaveAttribute('aria-current', 'page')
  })
})
