import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { STATUS } from '../pedidos/regrasPedidos'
import { buscarPedidos } from '../pedidos/servicoPedidos'
import { abrirQuadro, pedidoDeTeste, renderizarQuadro, usarTela } from '../testes/pedidosDeTeste'

// O backend é simulado aqui para os testes não dependerem da ZAP-44
vi.mock('../pedidos/servicoPedidos', async (importarOriginal) => ({
  ...(await importarOriginal()),
  buscarPedidos: vi.fn(),
}))

const pedido = pedidoDeTeste

const pedidos = [
  pedido(12, STATUS.NOVO, 'Ana Souza', { observacao: 'Festa infantil' }),
  pedido(10, STATUS.CONFIRMADO, 'Carla Dias'),
  pedido(9, STATUS.EM_PRODUCAO, 'Beatriz Rocha'),
  pedido(8, STATUS.CONCLUIDO, 'Pedro Alves'),
  pedido(7, STATUS.RECUSADO, 'Rita Gomes', { motivoRecusa: 'Agenda cheia nesse dia.' }),
]

describe('PaginaPedidos (US4, RF07, RF08)', () => {
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
      expect(within(novo).getByRole('button', { name: /Pedido 12, Ana Souza/ })).toBeVisible()
      expect(screen.queryByText('Rita Gomes')).not.toBeInTheDocument()
    })

    test('o card mostra número, cliente, retirada, itens e valor (RN09)', async () => {
      await abrirQuadro()

      const doze = screen.getByRole('button', { name: /Pedido 12/ })
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
      expect(within(recusados).getByRole('button', { name: /Pedido 7, Rita Gomes/ })).toBeVisible()
    })

    test('abre os detalhes do pedido e devolve o foco ao card ao fechar (RF08)', async () => {
      const usuario = userEvent.setup()
      await abrirQuadro()
      const cartao = screen.getByRole('button', { name: /Pedido 12, Ana Souza/ })

      await usuario.click(cartao)

      const detalhes = await screen.findByRole('dialog', { name: 'Pedido #12' })
      expect(within(detalhes).getByText('Festa infantil')).toBeVisible()
      expect(within(detalhes).getByText('(11) 98765-0000')).toBeVisible()
      expect(within(detalhes).getAllByText('R$ 200,00').length).toBeGreaterThan(0)

      await usuario.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(cartao).toHaveFocus()
    })
  })

  describe('no celular', () => {
    test('mostra uma coluna por vez, em abas', async () => {
      const usuario = userEvent.setup()
      await abrirQuadro()

      expect(screen.getByRole('tab', { name: 'Novo 1', selected: true })).toBeVisible()
      expect(screen.getByRole('button', { name: /Pedido 12/ })).toBeVisible()
      expect(screen.queryByRole('button', { name: /Pedido 10/ })).not.toBeInTheDocument()

      await usuario.click(screen.getByRole('tab', { name: 'Confirmado 1' }))
      expect(screen.getByRole('button', { name: /Pedido 10, Carla Dias/ })).toBeVisible()
    })

    test('ligar o filtro abre a aba dos recusados', async () => {
      const usuario = userEvent.setup()
      await abrirQuadro()

      await usuario.click(screen.getByRole('switch', { name: 'Mostrar recusados' }))

      expect(screen.getByRole('tab', { name: 'Recusado 1', selected: true })).toBeVisible()
      expect(screen.getByRole('button', { name: /Pedido 7, Rita Gomes/ })).toBeVisible()
    })
  })

  test('sem pedidos, explica onde eles vão aparecer', async () => {
    buscarPedidos.mockResolvedValue([])
    await abrirQuadro()

    expect(screen.getByText(/Nenhum pedido novo por enquanto/)).toBeVisible()
  })

  test('avisa quando não consegue carregar', async () => {
    buscarPedidos.mockRejectedValue(new Error('falhou'))
    renderizarQuadro()

    expect(await screen.findByText(/Não foi possível carregar os pedidos agora/)).toBeVisible()
  })
})
