import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { STATUS } from '../pedidos/regrasPedidos'
import { AcaoNaoPermitidaError, anonimizarCliente, buscarPedidos } from '../pedidos/servicoPedidos'
import { abrirPedido, mensagemDeTeste, pedidoDeTeste, renderizarQuadro, usarTela } from '../testes/pedidosDeTeste'

vi.mock('../pedidos/servicoPedidos', async (importarOriginal) => ({
  ...(await importarOriginal()),
  buscarPedidos: vi.fn(),
  anonimizarCliente: vi.fn(),
}))

const ANONIMO = { nome: 'Cliente anonimizado', telefone: '', anonimizado: true }
const BOTAO = 'Apagar dados do cliente'
const pronto = mensagemDeTeste('Pronto para retirada', { status: 'Enviada', enviadoEm: '2030-01-10T12:00' })

const concluido = pedidoDeTeste(8, STATUS.CONCLUIDO, 'Pedro Alves', { mensagens: [pronto] })
const outroDoPedro = pedidoDeTeste(5, STATUS.CONCLUIDO, 'Pedro Alves')
const recusado = pedidoDeTeste(4, STATUS.RECUSADO, 'Ana Lima', { motivoRecusa: 'Agenda cheia.', recusadoEm: '2030-01-10T11:00' })
const novo = pedidoDeTeste(12, STATUS.NOVO, 'Carla Dias')
const confirmado = pedidoDeTeste(11, STATUS.CONFIRMADO, 'João Pereira')
const emProducao = pedidoDeTeste(9, STATUS.EM_PRODUCAO, 'Beatriz Rocha')
const jaAnonimizado = pedidoDeTeste(3, STATUS.CONCLUIDO, 'x', { cliente: ANONIMO, mensagens: [mensagemDeTeste('Pronto para retirada', { link: undefined })] })
const pedidos = [concluido, outroDoPedro, recusado, novo, confirmado, emProducao, jaAnonimizado]

const anonimizar = (pedido) => ({ ...pedido, cliente: ANONIMO, mensagens: pedido.mensagens.map((m) => ({ ...m, link: undefined })) })

async function abrirJanela(usuario, numero) {
  const detalhes = await abrirPedido(usuario, numero)
  await usuario.click(within(detalhes).getByRole('button', { name: BOTAO }))
  return { detalhes, janela: await screen.findByRole('dialog', { name: 'Apagar os dados do cliente?' }) }
}

describe('Apagar os dados do cliente (ZAP-116, RN17)', () => {
  beforeEach(() => {
    usarTela(true)
    buscarPedidos.mockReset().mockResolvedValue(pedidos)
    anonimizarCliente.mockReset().mockImplementation(async (numero) => anonimizar(pedidos.find((p) => p.numero === numero)))
  })

  afterEach(() => usarTela(false))

  test('a janela explica em linguagem simples, começa em "Manter os dados" e manter não apaga nada', async () => {
    const usuario = userEvent.setup()
    const { detalhes, janela } = await abrirJanela(usuario, 8)

    expect(within(janela).getByText(/O nome e o WhatsApp de Pedro Alves serão apagados de todos os pedidos/)).toBeVisible()
    expect(within(janela).getByText(/Isso não pode ser desfeito/)).toBeVisible()
    await waitFor(() => expect(within(janela).getByRole('button', { name: 'Manter os dados' })).toHaveFocus())
    await usuario.click(within(janela).getByRole('button', { name: 'Manter os dados' }))

    expect(anonimizarCliente).not.toHaveBeenCalled()
    expect(within(detalhes).getByText('Pedro Alves')).toBeVisible()
  })

  test('apaga os dados, mostra "Cliente anonimizado" e tira o WhatsApp e o voltar para produção', async () => {
    const usuario = userEvent.setup()
    const { detalhes, janela } = await abrirJanela(usuario, 8)

    await usuario.click(within(janela).getByRole('button', { name: 'Apagar os dados' }))

    expect(anonimizarCliente).toHaveBeenCalledWith(8)
    const aviso = await within(detalhes).findByText(/Dados do cliente apagados/)
    await waitFor(() => expect(aviso.closest('[role="status"]')).toHaveFocus())
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Apagar os dados do cliente?' })).not.toBeInTheDocument())
    expect(within(detalhes).getByText('Cliente anonimizado')).toBeVisible()
    expect(within(detalhes).queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument()
    expect(within(detalhes).queryByRole('button', { name: BOTAO })).not.toBeInTheDocument()
    expect(within(detalhes).queryByRole('button', { name: 'Voltar para produção' })).not.toBeInTheDocument()
  })

  test('os outros pedidos do mesmo cliente também ficam sem o nome antigo no quadro', async () => {
    const usuario = userEvent.setup()
    buscarPedidos
      .mockResolvedValueOnce(pedidos)
      .mockResolvedValueOnce(pedidos.map((p) => (p.cliente.nome === 'Pedro Alves' ? anonimizar(p) : p)))
    const { detalhes, janela } = await abrirJanela(usuario, 8)

    await usuario.click(within(janela).getByRole('button', { name: 'Apagar os dados' }))
    await within(detalhes).findByText(/Dados do cliente apagados/)

    await waitFor(() => expect(screen.getByRole('button', { name: /Pedido 5, Cliente anonimizado/, hidden: true })).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /Pedido 5, Pedro Alves/, hidden: true })).not.toBeInTheDocument()
  })

  test('falha ao reler a lista não desfaz o aviso de sucesso', async () => {
    const usuario = userEvent.setup()
    buscarPedidos.mockResolvedValueOnce(pedidos).mockRejectedValueOnce(new Error('falhou'))
    const { detalhes, janela } = await abrirJanela(usuario, 8)

    await usuario.click(within(janela).getByRole('button', { name: 'Apagar os dados' }))

    expect(await within(detalhes).findByText(/Dados do cliente apagados/)).toBeVisible()
    expect(within(detalhes).queryByRole('alert')).not.toBeInTheDocument()
  })

  test('um pedido Recusado também pode ter os dados apagados', async () => {
    const usuario = userEvent.setup()
    renderizarQuadro()
    await usuario.click(await screen.findByRole('switch', { name: 'Mostrar recusados' }))
    await usuario.click(await screen.findByRole('button', { name: /Pedido 4,/ }))
    const detalhes = await screen.findByRole('dialog', { name: 'Pedido #4' })
    await usuario.click(within(detalhes).getByRole('button', { name: BOTAO }))
    const janela = await screen.findByRole('dialog', { name: 'Apagar os dados do cliente?' })

    await usuario.click(within(janela).getByRole('button', { name: 'Apagar os dados' }))

    await waitFor(() => expect(anonimizarCliente).toHaveBeenCalledWith(4))
  })

  test.each([
    ['Novo', 12],
    ['Confirmado', 11],
    ['Em produção', 9],
  ])('com o pedido %s, o botão fica bloqueado e a tela explica o motivo', async (_status, numero) => {
    const usuario = userEvent.setup()
    const detalhes = await abrirPedido(usuario, numero)

    const botao = within(detalhes).getByRole('button', { name: BOTAO })
    expect(botao).toBeDisabled()
    expect(botao).toHaveAccessibleDescription(/Só dá para apagar os dados quando o pedido estiver concluído ou recusado/)
    expect(within(detalhes).getByText(/Só dá para apagar os dados/)).toBeVisible()
  })

  test('mostra na janela o motivo do backend quando o cliente tem outro pedido em aberto', async () => {
    const usuario = userEvent.setup()
    const motivo = 'Este cliente ainda tem pedido em andamento (Novo, Confirmado ou Em produção). Conclua ou recuse esses pedidos antes de apagar os dados dele.'
    anonimizarCliente.mockRejectedValue(new AcaoNaoPermitidaError(motivo))
    const { detalhes, janela } = await abrirJanela(usuario, 8)

    await usuario.click(within(janela).getByRole('button', { name: 'Apagar os dados' }))

    const alerta = await within(janela).findByRole('alert')
    expect(alerta).toHaveTextContent(motivo)
    await waitFor(() => expect(alerta).toHaveFocus())
    expect(within(detalhes).getByText('Pedro Alves')).toBeVisible()
    expect(buscarPedidos).toHaveBeenCalledTimes(1)
  })

  test('sem motivo do backend, avisa que não conseguiu e mantém os dados', async () => {
    const usuario = userEvent.setup()
    anonimizarCliente.mockRejectedValue(new Error('falhou'))
    const { janela } = await abrirJanela(usuario, 8)

    await usuario.click(within(janela).getByRole('button', { name: 'Apagar os dados' }))

    expect(await within(janela).findByRole('alert')).toHaveTextContent('Não foi possível apagar os dados do cliente agora')
  })

  test('cliente já anonimizado não mostra a linha do WhatsApp, o botão de enviar nem o de apagar', async () => {
    const usuario = userEvent.setup()
    const detalhes = await abrirPedido(usuario, 3)

    expect(within(detalhes).getByText('Cliente anonimizado')).toBeVisible()
    expect(within(detalhes).queryByText('() -')).not.toBeInTheDocument()
    expect(within(detalhes).queryByText('WhatsApp', { selector: 'dt' })).not.toBeInTheDocument()
    expect(within(detalhes).queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument()
    expect(within(detalhes).getByText(/Não há WhatsApp para enviar/)).toBeVisible()
    expect(within(detalhes).queryByRole('button', { name: BOTAO })).not.toBeInTheDocument()
    expect(within(detalhes).queryByRole('button', { name: 'Voltar para produção' })).not.toBeInTheDocument()
  })

  test('cliente com dados continua mostrando a linha do WhatsApp', async () => {
    const usuario = userEvent.setup()
    const detalhes = await abrirPedido(usuario, 8)

    expect(within(detalhes).getByText('WhatsApp', { selector: 'dt' })).toBeVisible()
    expect(within(detalhes).getByText('(11) 98765-0000')).toBeVisible()
  })
})
