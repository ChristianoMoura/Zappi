import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { STATUS } from '../pedidos/regrasPedidos'
import { buscarPedido, buscarPedidos, editarPedido } from '../pedidos/servicoPedidos'
import { buscarProdutos } from '../produtos/servicoProdutos'
import { pedidoDeTeste, usarTela } from '../testes/pedidosDeTeste'
import { renderizarComRotas } from '../testes/renderizarComRotas'
import { PaginaFormularioPedido } from './PaginaFormularioPedido'
import { PaginaPedidos } from './PaginaPedidos'

// O backend é simulado aqui para os testes não dependerem da ZAP-90 e da ZAP-39
vi.mock('../pedidos/servicoPedidos', async (importarOriginal) => ({ ...(await importarOriginal()), buscarPedidos: vi.fn(), buscarPedido: vi.fn(), editarPedido: vi.fn() }))
vi.mock('../produtos/servicoProdutos', async (importarOriginal) => ({ ...(await importarOriginal()), buscarProdutos: vi.fn() }))


// O cardápio já subiu o brigadeiro para R$ 120; o pedido foi feito a R$ 100
const produtos = [
  { id: 1, nome: 'Bolo', sabor: 'Brigadeiro de chocolate', unidade: 'KG', preco: 120, ativo: true },
  { id: 2, nome: 'Bolo', sabor: 'Ninho com morango', unidade: 'KG', preco: 115, ativo: true },
]

const comCliente = (numero, status, extras) => pedidoDeTeste(numero, status, 'Ana Souza', { cliente: { nome: 'Ana Souza', telefone: '5511987650012' }, ...extras })
const novo = comCliente(12, STATUS.NOVO)
const confirmado = comCliente(11, STATUS.CONFIRMADO)
const emProducao = comCliente(9, STATUS.EM_PRODUCAO)
const concluido = comCliente(8, STATUS.CONCLUIDO)
const todos = [novo, confirmado, emProducao, concluido]

const rotas = [
  { path: '/pedidos', Component: PaginaPedidos },
  { path: '/pedidos/:numero/editar', Component: PaginaFormularioPedido },
]

const campo = (nome) => screen.getByRole('textbox', { name: nome })
const total = () => within(screen.getByText('Total').parentElement)

async function abrirEdicao(numero) {
  renderizarComRotas(rotas, `/pedidos/${numero}/editar`)
  return screen.findByRole('heading', { level: 1, name: `Editar pedido #${numero}` })
}

describe('Edição de pedido (ZAP-91, RF14, RN21)', () => {
  beforeEach(() => {
    usarTela(true)
    buscarProdutos.mockReset().mockResolvedValue(produtos)
    buscarPedidos.mockReset().mockResolvedValue(todos)
    buscarPedido.mockReset().mockImplementation(async (numero) => todos.find((p) => p.numero === numero))
    editarPedido.mockReset().mockImplementation(async (numero) => todos.find((p) => p.numero === numero))
  })

  afterEach(() => usarTela(false))

  test.each([[12, true], [11, true], [9, true], [8, false]])('botão Editar nos detalhes do pedido %i: %s', async (numero, aparece) => {
    const usuario = userEvent.setup()
    renderizarComRotas(rotas, '/pedidos')

    await usuario.click(await screen.findByRole('button', { name: new RegExp(`Pedido ${numero},`) }))
    const detalhes = await screen.findByRole('dialog', { name: `Pedido #${numero}` })

    if (aparece) expect(within(detalhes).getByRole('link', { name: 'Editar pedido' })).toHaveAttribute('href', `/pedidos/${numero}/editar`)
    else expect(within(detalhes).queryByRole('link', { name: 'Editar pedido' })).not.toBeInTheDocument()
  })

  test('pedido Novo abre preenchido, com o cliente editável', async () => {
    await abrirEdicao(12)

    expect(campo(/^Nome do cliente/)).toHaveValue('Ana Souza')
    expect(campo(/^WhatsApp/)).toHaveValue('(11) 98765-0012')
    expect(campo(/^Quantidade/)).toHaveValue('2')
    expect(screen.queryByRole('checkbox', { name: /O cliente autorizou/ })).not.toBeInTheDocument()
  })

  test('trocar o WhatsApp de um pedido Novo pede a autorização do novo cliente (RN16)', async () => {
    const usuario = userEvent.setup()
    await abrirEdicao(12)

    await usuario.type(campo(/^WhatsApp/), '{Backspace}')
    await usuario.type(campo(/^WhatsApp/), '9')
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(editarPedido).not.toHaveBeenCalled()
    expect(screen.getByText(/Confirme que o cliente autorizou/)).toBeVisible()
  })

  test('item antigo mantém o preço da época, e item novo usa o preço atual (RN10)', async () => {
    const usuario = userEvent.setup()
    await abrirEdicao(12)

    const produto = screen.getByRole('combobox', { name: /^Produto/ })
    expect(within(produto).getByRole('option', { name: /Bolo de brigadeiro de chocolate · R\$ 100,00 por kg \(preço do pedido\)/ })).toBeInTheDocument()
    expect(within(produto).queryByRole('option', { name: /R\$ 120,00/ })).not.toBeInTheDocument()
    expect(total().getByText('R$ 200,00')).toBeVisible()

    await usuario.click(screen.getByRole('button', { name: 'Adicionar outro item' }))
    await usuario.selectOptions(screen.getAllByRole('combobox', { name: /^Produto/ })[1], '1')
    await usuario.type(screen.getAllByRole('textbox', { name: /^Quantidade/ })[1], '1')
    expect(total().getByText('R$ 320,00')).toBeVisible()

    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    const [numero, dados] = editarPedido.mock.calls[0]
    expect(numero).toBe(12)
    expect(dados.itens.map((i) => i.precoUnitario)).toEqual([100, 120])
  })

  test('Confirmado mostra o cliente só para leitura e o aviso de que a confirmação será atualizada', async () => {
    await abrirEdicao(11)

    expect(screen.queryByRole('textbox', { name: /^Nome do cliente/ })).not.toBeInTheDocument()
    expect(screen.getByText('Ana Souza')).toBeVisible()
    expect(screen.getByText(/o Zappi prepara uma confirmação atualizada para enviar a Ana/)).toBeVisible()
  })

  test('Em produção avisa para combinar a mudança com o cliente, e salvar reabre o painel', async () => {
    const usuario = userEvent.setup()
    await abrirEdicao(9)
    expect(screen.getByText(/Ana já recebeu a confirmação deste pedido/)).toBeVisible()

    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(editarPedido).toHaveBeenCalledWith(9, expect.objectContaining({ cliente: { nome: 'Ana Souza', telefone: '5511987650012' } }))
    const detalhes = await screen.findByRole('dialog', { name: 'Pedido #9' })
    expect(await within(detalhes).findByText(/Pedido atualizado. Lembre de avisar Ana pelo WhatsApp/)).toBeVisible()
  })

  test('pedido Concluído não abre para edição', async () => {
    renderizarComRotas(rotas, '/pedidos/8/editar')

    expect(await screen.findByText('Este pedido já foi encerrado e não pode mais ser editado.')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Salvar alterações' })).not.toBeInTheDocument()
  })

  test('cancelar volta para os detalhes do pedido sem salvar', async () => {
    const usuario = userEvent.setup()
    await abrirEdicao(12)

    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(await screen.findByRole('dialog', { name: 'Pedido #12' })).toBeInTheDocument()
    expect(editarPedido).not.toHaveBeenCalled()
  })

  test('avisa quando não consegue salvar', async () => {
    const usuario = userEvent.setup()
    editarPedido.mockRejectedValue(new Error('falhou'))
    await abrirEdicao(12)

    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar o pedido agora')
  })
})
