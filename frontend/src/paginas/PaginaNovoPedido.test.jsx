import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { STATUS } from '../pedidos/regrasPedidos'
import { buscarPedidos, cadastrarPedido } from '../pedidos/servicoPedidos'
import { buscarProdutos } from '../produtos/servicoProdutos'
import { renderizarComRotas } from '../testes/renderizarComRotas'
import { pedidoDeTeste, usarTela } from '../testes/pedidosDeTeste'
import { PaginaNovoPedido } from './PaginaNovoPedido'
import { PaginaPedidos } from './PaginaPedidos'

// O backend é simulado aqui para os testes não dependerem da ZAP-88 e da ZAP-39
vi.mock('../pedidos/servicoPedidos', async (importarOriginal) => ({ ...(await importarOriginal()), buscarPedidos: vi.fn(), cadastrarPedido: vi.fn() }))
vi.mock('../produtos/servicoProdutos', async (importarOriginal) => ({ ...(await importarOriginal()), buscarProdutos: vi.fn() }))

const produtos = [
  { id: 1, nome: 'Bolo', sabor: 'Brigadeiro de chocolate', unidade: 'KG', preco: 100, ativo: true },
  { id: 4, nome: 'Salgado', sabor: 'Coxinha de frango', unidade: 'UN', preco: 1.2, ativo: true },
]

const rotas = [
  { path: '/pedidos', Component: PaginaPedidos },
  { path: '/pedidos/novo', Component: PaginaNovoPedido },
]

const campo = (nome) => screen.getByRole('textbox', { name: nome })
const daqui = (dias) => {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function abrirFormulario() {
  renderizarComRotas(rotas, '/pedidos/novo')
  return screen.findByRole('heading', { level: 1, name: 'Novo pedido' })
}

async function preencherCliente(usuario) {
  await usuario.type(campo(/^Nome do cliente/), 'Fernanda Costa')
  await usuario.type(campo(/^WhatsApp/), '11987650099')
  await usuario.click(screen.getByRole('checkbox', { name: /O cliente autorizou/ }))
}

describe('Cadastro de pedido (ZAP-89, US7, RF13)', () => {
  beforeEach(() => {
    usarTela(true)
    buscarProdutos.mockReset().mockResolvedValue(produtos)
    buscarPedidos.mockReset().mockResolvedValue([pedidoDeTeste(12, STATUS.NOVO, 'Ana Souza')])
    cadastrarPedido.mockReset().mockImplementation(async (dados) => {
      const pedido = pedidoDeTeste(14, STATUS.NOVO, dados.cliente.nome, { itens: dados.itens, dataRetirada: dados.dataRetirada })
      buscarPedidos.mockResolvedValue([pedidoDeTeste(12, STATUS.NOVO, 'Ana Souza'), pedido])
      return pedido
    })
  })

  afterEach(() => usarTela(false))

  test('o quadro tem o botão "Novo pedido", que abre o formulário', async () => {
    const usuario = userEvent.setup()
    renderizarComRotas(rotas, '/pedidos')

    await usuario.click(await screen.findByRole('link', { name: 'Novo pedido' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Novo pedido' })).toHaveFocus()
    expect(screen.getByRole('combobox', { name: /^Produto/ })).toBeInTheDocument()
  })

  test('não salva sem os campos obrigatórios e leva o foco ao primeiro erro', async () => {
    const usuario = userEvent.setup()
    await abrirFormulario()

    await usuario.click(screen.getByRole('button', { name: 'Salvar pedido' }))

    expect(cadastrarPedido).not.toHaveBeenCalled()
    expect(campo(/^Nome do cliente/)).toHaveFocus()
    expect(screen.getByText('Escreva o WhatsApp do cliente com DDD.')).toBeVisible()
    expect(screen.getByText(/Confirme que o cliente autorizou/)).toBeVisible()
    expect(screen.getByText('Escolha o produto.')).toBeVisible()
    expect(screen.getByText('Escolha a data de retirada.')).toBeVisible()
  })

  test('calcula o subtotal e o total na tela, com mais de um item (RN11)', async () => {
    const usuario = userEvent.setup()
    await abrirFormulario()

    await usuario.selectOptions(screen.getByRole('combobox', { name: /^Produto/ }), '1')
    await usuario.type(campo(/^Quantidade/), '1,5')
    await usuario.click(screen.getByRole('button', { name: 'Adicionar outro item' }))
    const produtoNovo = screen.getAllByRole('combobox', { name: /^Produto/ })[1]
    expect(produtoNovo).toHaveFocus()
    await usuario.selectOptions(produtoNovo, '4')
    await usuario.type(screen.getAllByRole('textbox', { name: /^Quantidade/ })[1], '50')

    expect(screen.getByText('R$ 150,00')).toBeVisible()
    expect(screen.getByText('R$ 60,00')).toBeVisible()
    expect(within(screen.getByText('Total').parentElement).getByText('R$ 210,00')).toBeVisible()

    await usuario.click(screen.getByRole('button', { name: 'Remover item 2' }))
    expect(within(screen.getByText('Total').parentElement).getByText('R$ 150,00')).toBeVisible()
  })

  test('salgado vendido por unidade não aceita fração (RN12)', async () => {
    const usuario = userEvent.setup()
    await abrirFormulario()
    await preencherCliente(usuario)
    await usuario.selectOptions(screen.getByRole('combobox', { name: /^Produto/ }), '4')
    await usuario.type(campo(/^Quantidade/), '50,5')

    await usuario.click(screen.getByRole('button', { name: 'Salvar pedido' }))

    expect(cadastrarPedido).not.toHaveBeenCalled()
    expect(campo(/^Quantidade/)).toHaveFocus()
    expect(campo(/^Quantidade/)).toHaveAccessibleDescription(/número inteiro/)
  })

  test('cadastra o pedido e mostra o card novo na coluna Novo, com o foco nele', async () => {
    const usuario = userEvent.setup()
    await abrirFormulario()
    await preencherCliente(usuario)
    await usuario.selectOptions(screen.getByRole('combobox', { name: /^Produto/ }), '1')
    await usuario.type(campo(/^Quantidade/), '2')
    await usuario.type(campo(/^Recheio/), 'Brigadeiro')
    await usuario.type(campo(/^Observação do item/), 'massa branca')
    await usuario.type(screen.getByLabelText(/^Data de retirada/), daqui(5))
    await usuario.type(screen.getByRole('textbox', { name: /^Observações do pedido/ }), 'Aniversário')

    await usuario.click(screen.getByRole('button', { name: 'Salvar pedido' }))

    expect(cadastrarPedido).toHaveBeenCalledWith({
      cliente: { nome: 'Fernanda Costa', telefone: '5511987650099' },
      consentimentoLgpd: true,
      dataRetirada: daqui(5),
      observacao: 'Aniversário',
      itens: [{ produtoId: 1, produto: 'Bolo', sabor: 'Brigadeiro de chocolate', unidade: 'KG', quantidade: 2, precoUnitario: 100, recheio: 'Brigadeiro', observacao: 'massa branca' }],
    })
    expect(await screen.findByText('Pedido #14 de Fernanda Costa cadastrado na coluna Novo.')).toBeVisible()
    const novo = screen.getByRole('region', { name: /Novo/ })
    expect(within(novo).getByRole('button', { name: /Pedido 14, Fernanda Costa/ })).toHaveFocus()
  })

  test('avisa quando não consegue salvar e mantém o que foi digitado', async () => {
    const usuario = userEvent.setup()
    cadastrarPedido.mockRejectedValue(new Error('falhou'))
    await abrirFormulario()
    await preencherCliente(usuario)
    await usuario.selectOptions(screen.getByRole('combobox', { name: /^Produto/ }), '1')
    await usuario.type(campo(/^Quantidade/), '2')
    await usuario.type(screen.getByLabelText(/^Data de retirada/), daqui(3))

    await usuario.click(screen.getByRole('button', { name: 'Salvar pedido' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar o pedido agora')
    expect(campo(/^Nome do cliente/)).toHaveValue('Fernanda Costa')
  })

  test('cancelar volta para o quadro com o foco no botão "Novo pedido"', async () => {
    const usuario = userEvent.setup()
    await abrirFormulario()

    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(await screen.findByRole('link', { name: 'Novo pedido' })).toHaveFocus()
    expect(cadastrarPedido).not.toHaveBeenCalled()
  })

  test('com o cardápio vazio, leva para o cadastro de produto', async () => {
    buscarProdutos.mockResolvedValue([])
    renderizarComRotas(rotas, '/pedidos/novo')

    expect(await screen.findByText(/O cardápio está vazio/)).toBeVisible()
    expect(screen.getByRole('link', { name: 'Cadastrar produto' })).toHaveAttribute('href', '/produtos/novo')
  })
})
