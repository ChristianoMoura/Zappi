import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { STATUS } from '../pedidos/regrasPedidos'
import { buscarPedidos } from '../pedidos/servicoPedidos'
import { abrirPedido, abrirQuadro, pedidoDeTeste, renderizarQuadro, usarTela } from '../testes/pedidosDeTeste'

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
      expect(doze).toHaveTextContent('Retirada: ter, 15/01, 15h')
      expect(doze).toHaveTextContent('Bolo de brigadeiro de chocolate · 2 kg')
      expect(doze).toHaveTextContent('R$ 200,00')
    })

    test('a caixa de filtro tem nome acessível, "Todos" e cada status com a quantidade (ZAP-179)', async () => {
      await abrirQuadro()

      const filtro = screen.getByRole('combobox', { name: 'Filtrar pedidos por status' })
      expect(filtro).toHaveValue('')
      expect(within(filtro).getAllByRole('option').map((o) => o.textContent)).toEqual(['Todos', 'Novo (1)', 'Confirmado (1)', 'Em produção (1)', 'Concluído (1)', 'Entregue (0)', 'Recusado (1)'])
      expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    })

    test('escolhendo um status, mostra só a coluna dele, em grade, guarda no endereço e anuncia o resultado', async () => {
      const usuario = userEvent.setup()
      const roteador = renderizarQuadro()
      await screen.findByRole('heading', { level: 1, name: 'Pedidos' })

      await usuario.selectOptions(screen.getByRole('combobox', { name: 'Filtrar pedidos por status' }), '5')

      expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Recusado1'])
      const recusados = screen.getByRole('group', { name: 'Pedidos da coluna Recusado, 1 pedido' })
      expect(within(recusados).getByRole('button', { name: /Pedido 7, Rita Gomes/ })).toBeVisible()
      expect(roteador.state.location.search).toBe('?status=5')
      expect(screen.getByText('Mostrando 1 pedido em Recusado.')).toBeInTheDocument()
    })

    test('abre já filtrado pelo endereço e mostra "Ver todos" quando não há pedidos no status', async () => {
      const usuario = userEvent.setup()
      await abrirQuadro('/pedidos?status=6')

      expect(screen.getByRole('combobox', { name: 'Filtrar pedidos por status' })).toHaveValue('6')
      expect(screen.getByText('Nenhum pedido em Entregue.')).toBeVisible()
      await usuario.click(screen.getByRole('button', { name: 'Ver todos' }))

      expect(screen.getByRole('combobox', { name: 'Filtrar pedidos por status' })).toHaveValue('')
      expect(screen.getByRole('combobox', { name: 'Filtrar pedidos por status' })).toHaveFocus()
      expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(4)
    })

    test.each(['99', 'abc', ''])('valor inválido no endereço (?status=%s) abre em "Todos" (ZAP-180)', async (valor) => {
      await abrirQuadro(`/pedidos?status=${valor}`)

      expect(screen.getByRole('combobox', { name: 'Filtrar pedidos por status' })).toHaveValue('')
      expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent.replace(/\d+$/, ''))).toEqual(['Novo', 'Confirmado', 'Em produção', 'Concluído'])
      expect(screen.queryByText('Rita Gomes')).not.toBeInTheDocument()
    })

    test('voltando para "Todos" pelo filtro, o endereço fica sem status e o resultado é anunciado (ZAP-180)', async () => {
      const usuario = userEvent.setup()
      const roteador = renderizarQuadro('/pedidos?status=2')
      await screen.findByRole('heading', { level: 1, name: 'Pedidos' })

      await usuario.selectOptions(screen.getByRole('combobox', { name: 'Filtrar pedidos por status' }), '')

      expect(roteador.state.location.search).toBe('')
      expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(4)
      expect(screen.getByText('Mostrando todos os pedidos, menos os entregues e os recusados.')).toBeInTheDocument()
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

    test('os detalhes mostram itens, preço congelado, total igual à soma e histórico (RF08, RN10, RN11)', async () => {
      const usuario = userEvent.setup()
      buscarPedidos.mockResolvedValue([
        pedido(15, STATUS.CONCLUIDO, 'Ana Souza', {
          observacao: 'Festa infantil',
          confirmadoEm: '2030-01-11T09:00',
          producaoEm: '2030-01-12T08:30',
          concluidoEm: '2030-01-14T17:45',
          itens: [
            { produto: 'Bolo de brigadeiro de chocolate', unidade: 'KG', quantidade: 1.5, precoUnitario: 100, observacao: 'Recheio: brigadeiro. Cobertura: granulado.' },
            { produto: 'Cento de coxinha', unidade: 'UN', quantidade: 1, precoUnitario: 120 },
          ],
        }),
      ])

      const detalhes = await abrirPedido(usuario, 15)

      for (const texto of [
        'Datater, 15/01, 15h',
        'Festa infantil',
        'Na retirada',
        'Ana Souza',
        'Bolo de brigadeiro de chocolate',
        'R$ 150,00',
        '1,5 kg × R$ 100,00/kg',
        'Obs.: Recheio: brigadeiro. Cobertura: granulado.',
        'Cento de coxinha',
        'R$ 120,00',
        'TotalR$ 270,00',
        'Recebido10/01 às 10:00',
        'Confirmado11/01 às 09:00',
        'Em produção12/01 às 08:30',
        'Concluído14/01 às 17:45',
      ]) {
        expect(detalhes).toHaveTextContent(texto)
      }
    })

    test('com a forma de pagamento no backend, os detalhes dizem qual é, e "Não informada" no pedido antigo (ZAP-193)', async () => {
      const usuario = userEvent.setup()
      buscarPedidos.mockResolvedValue([
        pedido(15, STATUS.NOVO, 'Ana Souza', { formaPagamento: 'PIX' }),
        pedido(16, STATUS.NOVO, 'Bia Lopes', { formaPagamento: null }),
      ])

      expect(await abrirPedido(usuario, 15)).toHaveTextContent('Pagamento na retiradaPix')
      await usuario.click(screen.getByRole('button', { name: 'Fechar detalhes' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(await abrirPedido(usuario, 16)).toHaveTextContent('Pagamento na retiradaNão informada')
    })

    test('cada coluna tem a lista de cards com rolagem própria, que recebe o foco pelo Tab e tem o nome da coluna (ZAP-165)', async () => {
      const usuario = userEvent.setup()
      buscarPedidos.mockResolvedValue([...pedidos, pedido(13, STATUS.NOVO, 'Bruno Lima'), pedido(14, STATUS.NOVO, 'Davi Melo')])
      await abrirQuadro()

      const novo = screen.getByRole('group', { name: 'Pedidos da coluna Novo, 3 pedidos' })
      expect(novo).toHaveAttribute('tabindex', '0')
      expect(within(novo).getAllByRole('button')).toHaveLength(3)
      expect(screen.getByRole('group', { name: 'Pedidos da coluna Confirmado, 1 pedido' })).toBeInTheDocument()

      // O Tab passa pela lista e depois pelos cards dela, na ordem da coluna
      screen.getByRole('link', { name: 'Novo pedido' }).focus()
      await usuario.tab()
      expect(novo).toHaveFocus()
      await usuario.tab()
      expect(within(novo).getAllByRole('button')[0]).toHaveFocus()
    })

    test('coluna sem pedidos não tem área rolável', async () => {
      buscarPedidos.mockResolvedValue([pedido(12, STATUS.NOVO, 'Ana Souza')])
      await abrirQuadro()

      expect(screen.queryByRole('group', { name: /coluna Confirmado/ })).not.toBeInTheDocument()
      expect(within(screen.getByRole('region', { name: /Confirmado/ })).getByText('Nenhum pedido aqui.')).toBeVisible()
    })
  })

  describe('no celular', () => {
    test('as abas continuam sem a área rolável das colunas (ZAP-165)', async () => {
      await abrirQuadro()

      expect(screen.queryByRole('group', { name: /Pedidos da coluna/ })).not.toBeInTheDocument()
    })

    test('mostra uma coluna por vez, em abas', async () => {
      const usuario = userEvent.setup()
      await abrirQuadro()

      expect(screen.getByRole('tab', { name: 'Novo 1', selected: true })).toBeVisible()
      expect(screen.getByRole('button', { name: /Pedido 12/ })).toBeVisible()
      expect(screen.queryByRole('button', { name: /Pedido 10/ })).not.toBeInTheDocument()

      await usuario.click(screen.getByRole('tab', { name: 'Confirmado 1' }))
      expect(screen.getByRole('button', { name: /Pedido 10, Carla Dias/ })).toBeVisible()
    })

    test('com um status no filtro, mostra a lista dele, sem as abas (ZAP-179)', async () => {
      const usuario = userEvent.setup()
      await abrirQuadro()
      expect(screen.queryByRole('tab', { name: /Recusado/ })).not.toBeInTheDocument()

      await usuario.selectOptions(screen.getByRole('combobox', { name: 'Filtrar pedidos por status' }), '5')

      expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2, name: /Recusado/ })).toBeVisible()
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
