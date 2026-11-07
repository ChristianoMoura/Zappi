import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { STATUS } from '../pedidos/regrasPedidos'
import { buscarPedidos } from '../pedidos/servicoPedidos'
import { renderizarComRotas } from '../testes/renderizarComRotas'
import { PaginaPedidos } from './PaginaPedidos'

// O backend é simulado aqui para os testes não dependerem da ZAP-44
vi.mock('../pedidos/servicoPedidos', async (importarOriginal) => ({
  ...(await importarOriginal()),
  buscarPedidos: vi.fn(),
}))

const pedido = (numero, status, nome, extras = {}) => ({
  numero,
  status,
  dataRetirada: '2030-01-15',
  criadoEm: '2030-01-10T10:00',
  cliente: { nome, telefone: '5511987650000' },
  itens: [{ produto: 'Bolo', sabor: 'Brigadeiro de chocolate', unidade: 'KG', quantidade: 2, precoUnitario: 100 }],
  mensagens: [],
  ...extras,
})

const pedidos = [
  pedido(12, STATUS.NOVO, 'Ana Souza'),
  pedido(10, STATUS.CONFIRMADO, 'Carla Dias'),
  pedido(9, STATUS.EM_PRODUCAO, 'Beatriz Rocha'),
  pedido(8, STATUS.CONCLUIDO, 'Pedro Alves'),
  pedido(7, STATUS.RECUSADO, 'Rita Gomes', { motivoRecusa: 'Agenda cheia nesse dia.' }),
]

// Simula a largura da tela: o quadro usa (min-width: 48em) para separar computador e celular
function usarTela(grande) {
  window.matchMedia.mockImplementation((consulta) => ({
    matches: grande,
    media: consulta,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

async function abrirQuadro() {
  renderizarComRotas([{ path: '/pedidos', Component: PaginaPedidos }], '/pedidos')
  return screen.findByRole('heading', { level: 1, name: 'Pedidos' })
}

const cartao = (numero) => screen.getByRole('article', { name: `Pedido ${numero}` })

describe('PaginaPedidos (US4, RF07)', () => {
  beforeEach(() => {
    buscarPedidos.mockReset().mockResolvedValue(pedidos)
  })

  afterEach(() => usarTela(false))

  describe('no computador', () => {
    beforeEach(() => usarTela(true))

    test('mostra as quatro colunas e esconde os recusados (RF07, RN04)', async () => {
      await abrirQuadro()

      for (const nome of ['Novo', 'Confirmado', 'Em produção', 'Concluído']) {
        expect(screen.getByRole('heading', { level: 2, name: new RegExp(nome) })).toBeVisible()
      }
      expect(screen.queryByRole('heading', { level: 2, name: /Recusado/ })).not.toBeInTheDocument()
      const novo = screen.getByRole('region', { name: /Novo/ })
      expect(within(novo).getByRole('article', { name: 'Pedido 12' })).toHaveTextContent('Ana Souza')
      expect(screen.queryByText('Rita Gomes')).not.toBeInTheDocument()
    })

    test('o card mostra número, cliente, retirada, itens e valor (RN09)', async () => {
      await abrirQuadro()

      const doze = cartao(12)
      expect(doze).toHaveTextContent('#12')
      expect(doze).toHaveTextContent('Ana Souza')
      expect(doze).toHaveTextContent('Retirada: ter, 15/01')
      expect(doze).toHaveTextContent('Bolo de brigadeiro de chocolate · 2 kg')
      expect(doze).toHaveTextContent('R$ 200,00')
    })

    test('o filtro com rótulo visível mostra a coluna dos recusados (NBR 17225 5.3.1)', async () => {
      const usuario = userEvent.setup()
      await abrirQuadro()

      await usuario.click(screen.getByRole('switch', { name: 'Mostrar recusados' }))

      const recusados = screen.getByRole('region', { name: /Recusado/ })
      expect(within(recusados).getByRole('article', { name: 'Pedido 7' })).toHaveTextContent('Rita Gomes')
    })
  })

  describe('no celular', () => {
    test('mostra uma coluna por vez, em abas', async () => {
      const usuario = userEvent.setup()
      await abrirQuadro()

      expect(screen.getByRole('tab', { name: 'Novo 1', selected: true })).toBeVisible()
      expect(cartao(12)).toBeVisible()
      expect(screen.queryByRole('article', { name: 'Pedido 10' })).not.toBeInTheDocument()

      await usuario.click(screen.getByRole('tab', { name: 'Confirmado 1' }))
      expect(cartao(10)).toHaveTextContent('Carla Dias')
    })

    test('ligar o filtro abre a aba dos recusados', async () => {
      const usuario = userEvent.setup()
      await abrirQuadro()

      await usuario.click(screen.getByRole('switch', { name: 'Mostrar recusados' }))

      expect(screen.getByRole('tab', { name: 'Recusado 1', selected: true })).toBeVisible()
      expect(cartao(7)).toHaveTextContent('Rita Gomes')
    })
  })

  test('sem pedidos, explica onde eles vão aparecer', async () => {
    buscarPedidos.mockResolvedValue([])
    await abrirQuadro()

    expect(screen.getByText(/Nenhum pedido novo por enquanto/)).toBeVisible()
  })

  test('avisa quando não consegue carregar', async () => {
    buscarPedidos.mockRejectedValue(new Error('falhou'))
    renderizarComRotas([{ path: '/pedidos', Component: PaginaPedidos }], '/pedidos')

    expect(await screen.findByText(/Não foi possível carregar os pedidos agora/)).toBeVisible()
  })
})
