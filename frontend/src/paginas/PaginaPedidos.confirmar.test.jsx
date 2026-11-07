import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { STATUS } from '../pedidos/regrasPedidos'
import { buscarPedidos, confirmarPedido, marcarMensagemEnviada } from '../pedidos/servicoPedidos'
import { renderizarComRotas } from '../testes/renderizarComRotas'
import { PaginaPedidos } from './PaginaPedidos'

// O backend é simulado aqui para os testes não dependerem da ZAP-49 e da ZAP-50
vi.mock('../pedidos/servicoPedidos', async (importarOriginal) => ({
  ...(await importarOriginal()),
  buscarPedidos: vi.fn(),
  confirmarPedido: vi.fn(),
  marcarMensagemEnviada: vi.fn(),
}))

const mensagem = (tipo, extras = {}) => ({ tipo, status: 'Pendente', texto: `Texto de ${tipo}`, link: 'https://wa.me/?text=teste', ...extras })

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

const ana = pedido(12, STATUS.NOVO, 'Ana Souza')
const anaConfirmada = { ...ana, status: STATUS.CONFIRMADO, confirmadoEm: '2030-01-11T09:00', mensagens: [mensagem('Confirmação')] }

const pedidos = [
  ana,
  pedido(9, STATUS.EM_PRODUCAO, 'Beatriz Rocha', { mensagens: [mensagem('Confirmação', { status: 'Enviada', enviadoEm: '2030-01-09T17:50' })] }),
  pedido(8, STATUS.CONCLUIDO, 'Pedro Alves', {
    mensagens: [mensagem('Confirmação', { status: 'Enviada', enviadoEm: '2030-01-08T13:15' }), mensagem('Pronto para retirada')],
  }),
]

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

async function abrirPedido(usuario, numero) {
  renderizarComRotas([{ path: '/pedidos', Component: PaginaPedidos }], '/pedidos')
  await usuario.click(await screen.findByRole('button', { name: new RegExp(`Pedido ${numero},`) }))
  return screen.findByRole('dialog', { name: `Pedido #${numero}` })
}

describe('Confirmar pedido e enviar no WhatsApp (ZAP-51, RF09, RF10)', () => {
  beforeEach(() => {
    usarTela(true)
    buscarPedidos.mockReset().mockResolvedValue(pedidos)
    confirmarPedido.mockReset().mockResolvedValue(anaConfirmada)
    marcarMensagemEnviada.mockReset().mockImplementation(async (_numero, indice) => ({
      ...anaConfirmada,
      mensagens: anaConfirmada.mensagens.map((m, i) => (i === indice ? { ...m, status: 'Enviada', enviadoEm: '2030-01-11T09:05' } : m)),
    }))
  })

  afterEach(() => usarTela(false))

  test('confirma o pedido Novo, move o card e leva o foco para enviar a mensagem', async () => {
    const usuario = userEvent.setup()
    const detalhes = await abrirPedido(usuario, 12)

    await usuario.click(within(detalhes).getByRole('button', { name: 'Confirmar pedido' }))

    expect(confirmarPedido).toHaveBeenCalledWith(12)
    expect(await within(detalhes).findByText(/Pedido confirmado e movido para a coluna Confirmado/)).toBeVisible()
    expect(within(detalhes).queryByRole('button', { name: 'Confirmar pedido' })).not.toBeInTheDocument()
    const enviar = within(detalhes).getByRole('link', { name: /Enviar no WhatsApp para Ana/ })
    expect(enviar).toHaveFocus()
    expect(enviar).toHaveAttribute('href', 'https://wa.me/?text=teste')
    expect(within(detalhes).getByText('Ainda não enviada')).toBeVisible()
    const confirmado = screen.getByRole('region', { name: /Confirmado/ })
    expect(within(confirmado).getByRole('button', { name: /Pedido 12, Ana Souza/ })).toBeInTheDocument()
  })

  test('ao clicar em "Enviar no WhatsApp", a mensagem fica como enviada e pode ser reenviada', async () => {
    const usuario = userEvent.setup()
    const detalhes = await abrirPedido(usuario, 12)
    await usuario.click(within(detalhes).getByRole('button', { name: 'Confirmar pedido' }))
    const enviar = await within(detalhes).findByRole('link', { name: /Enviar no WhatsApp/ })
    enviar.addEventListener('click', (evento) => evento.preventDefault())

    await usuario.click(enviar)

    await waitFor(() => expect(marcarMensagemEnviada).toHaveBeenCalledWith(12, 0))
    expect(await within(detalhes).findByText('Enviada')).toBeVisible()
    expect(within(detalhes).getByRole('link', { name: /Enviar de novo no WhatsApp/ })).toBeVisible()
    expect(within(detalhes).getByText(/Enviada em 11\/01 às 09:05/)).toBeVisible()
  })

  test('avisa quando não consegue confirmar e mantém o pedido em Novo', async () => {
    const usuario = userEvent.setup()
    confirmarPedido.mockRejectedValue(new Error('falhou'))
    const detalhes = await abrirPedido(usuario, 12)

    await usuario.click(within(detalhes).getByRole('button', { name: 'Confirmar pedido' }))

    expect(await within(detalhes).findByRole('alert')).toHaveTextContent('Não foi possível confirmar o pedido agora')
    expect(within(detalhes).getByRole('button', { name: 'Confirmar pedido' })).toBeVisible()
  })

  test('em produção não oferece enviar a confirmação; ela fica nas mensagens anteriores', async () => {
    const usuario = userEvent.setup()
    const detalhes = await abrirPedido(usuario, 9)

    expect(within(detalhes).queryByRole('link', { name: /Enviar/ })).not.toBeInTheDocument()
    expect(within(detalhes).getByText(/Nesta etapa não há mensagem para enviar/)).toBeVisible()
    expect(within(detalhes).getByText('Mensagens anteriores (1)')).toBeVisible()
  })

  test('em concluído só o aviso de pronto tem o botão de enviar', async () => {
    const usuario = userEvent.setup()
    const detalhes = await abrirPedido(usuario, 8)

    expect(within(detalhes).getAllByRole('link', { name: /Enviar no WhatsApp/ })).toHaveLength(1)
    expect(within(detalhes).getByText('Pronto para retirada')).toBeVisible()
    expect(within(detalhes).getByText('Mensagens anteriores (1)')).toBeVisible()
  })
})
