import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { STATUS } from '../pedidos/regrasPedidos'
import { avancarPedido, buscarPedidos, voltarPedido } from '../pedidos/servicoPedidos'
import { abrirPedido, mensagemDeTeste, pedidoDeTeste, usarTela } from '../testes/pedidosDeTeste'

// O backend é simulado aqui para os testes não dependerem da ZAP-75 e da ZAP-76
vi.mock('../pedidos/servicoPedidos', async (importarOriginal) => ({
  ...(await importarOriginal()),
  buscarPedidos: vi.fn(),
  avancarPedido: vi.fn(),
  voltarPedido: vi.fn(),
}))

const enviada = (tipo) => mensagemDeTeste(tipo, { status: 'Enviada', enviadoEm: '2030-01-10T12:00' })
const joao = pedidoDeTeste(11, STATUS.CONFIRMADO, 'João Pereira', { mensagens: [enviada('Confirmação')] })
const beatriz = pedidoDeTeste(9, STATUS.EM_PRODUCAO, 'Beatriz Rocha', { mensagens: [enviada('Confirmação')] })
const pedro = pedidoDeTeste(8, STATUS.CONCLUIDO, 'Pedro Alves', { mensagens: [enviada('Confirmação'), enviada('Pronto para retirada')] })
const lia = pedidoDeTeste(7, STATUS.ENTREGUE, 'Lia Moraes', { entregueEm: '2030-01-14T18:10', mensagens: [enviada('Confirmação'), enviada('Pronto para retirada')] })
const pedidos = [joao, beatriz, pedro, lia]

const PROXIMO = { [STATUS.CONFIRMADO]: STATUS.EM_PRODUCAO, [STATUS.EM_PRODUCAO]: STATUS.CONCLUIDO, [STATUS.CONCLUIDO]: STATUS.ENTREGUE }
const ANTERIOR = { [STATUS.EM_PRODUCAO]: STATUS.CONFIRMADO, [STATUS.CONCLUIDO]: STATUS.EM_PRODUCAO, [STATUS.ENTREGUE]: STATUS.CONCLUIDO }

function avancado(numero) {
  const original = pedidos.find((p) => p.numero === numero)
  const status = PROXIMO[original.status]
  const mensagens = status === STATUS.CONCLUIDO ? [...original.mensagens, mensagemDeTeste('Pronto para retirada')] : original.mensagens
  const entregueEm = status === STATUS.ENTREGUE ? '2030-01-15T10:30' : undefined
  return { ...original, status, mensagens, entregueEm }
}

function voltado(numero) {
  const original = pedidos.find((p) => p.numero === numero)
  return { ...original, status: ANTERIOR[original.status], entregueEm: undefined }
}

describe('Andamento do pedido e voltar coluna (ZAP-77, RN03)', () => {
  beforeEach(() => {
    usarTela(true)
    buscarPedidos.mockReset().mockResolvedValue(pedidos)
    avancarPedido.mockReset().mockImplementation(async (numero) => avancado(numero))
    voltarPedido.mockReset().mockImplementation(async (numero) => voltado(numero))
  })

  afterEach(() => usarTela(false))

  test('inicia a produção de um pedido Confirmado e move o card', async () => {
    const usuario = userEvent.setup()
    const detalhes = await abrirPedido(usuario, 11)

    expect(within(detalhes).queryByRole('button', { name: /Voltar/ })).not.toBeInTheDocument()
    await usuario.click(within(detalhes).getByRole('button', { name: 'Iniciar produção' }))

    expect(avancarPedido).toHaveBeenCalledWith(11)
    const aviso = await within(detalhes).findByText(/Pedido movido para a coluna Em produção/)
    expect(aviso.closest('[role="status"]')).toHaveFocus()
    expect(within(detalhes).getByRole('button', { name: 'Marcar como pronto' })).toBeVisible()
    const coluna = screen.getByRole('region', { name: /Em produção/ })
    expect(within(coluna).getByRole('button', { name: /Pedido 11, João Pereira/ })).toBeInTheDocument()
  })

  test('marca como pronto e leva o foco para enviar o aviso de pronto', async () => {
    const usuario = userEvent.setup()
    const detalhes = await abrirPedido(usuario, 9)

    await usuario.click(within(detalhes).getByRole('button', { name: 'Marcar como pronto' }))

    expect(await within(detalhes).findByText(/Pedido pronto e movido para a coluna Concluído. Agora envie a mensagem para Beatriz./)).toBeVisible()
    expect(within(detalhes).getByRole('link', { name: /Enviar no WhatsApp para Beatriz/ })).toHaveFocus()
    expect(within(detalhes).getByText('Pronto para retirada')).toBeVisible()
  })

  test('voltar pede confirmação e "Manter como está" não muda o pedido', async () => {
    const usuario = userEvent.setup()
    const detalhes = await abrirPedido(usuario, 9)

    await usuario.click(within(detalhes).getByRole('button', { name: 'Voltar para confirmado' }))
    const janela = await screen.findByRole('dialog', { name: 'Voltar o pedido #9 para Confirmado?' })
    expect(within(janela).getByRole('button', { name: 'Manter como está' })).toHaveFocus()
    await usuario.click(within(janela).getByRole('button', { name: 'Manter como está' }))

    expect(voltarPedido).not.toHaveBeenCalled()
    expect(within(detalhes).getByRole('button', { name: 'Marcar como pronto' })).toBeVisible()
  })

  test('volta um Concluído para produção e lembra de avisar o cliente que já recebeu o aviso de pronto', async () => {
    const usuario = userEvent.setup()
    const detalhes = await abrirPedido(usuario, 8)

    await usuario.click(within(detalhes).getByRole('button', { name: 'Voltar para produção' }))
    const janela = await screen.findByRole('dialog', { name: 'Voltar o pedido #8 para Em produção?' })
    expect(within(janela).getByText(/Pedro já recebeu o aviso de que o pedido estava pronto/)).toBeVisible()
    await usuario.click(within(janela).getByRole('button', { name: 'Voltar para produção' }))

    expect(voltarPedido).toHaveBeenCalledWith(8)
    expect(await within(detalhes).findByText(/Pedido voltou para a coluna Em produção. Lembre de avisar Pedro/)).toBeVisible()
    expect(within(detalhes).getByRole('button', { name: 'Marcar como pronto' })).toBeVisible()
  })

  test('marca um Concluído como entregue: o card vai para a coluna Entregue com a data da entrega (ZAP-169)', async () => {
    const usuario = userEvent.setup()
    const detalhes = await abrirPedido(usuario, 8)

    expect(within(detalhes).getByRole('button', { name: 'Voltar para produção' })).toBeVisible()
    await usuario.click(within(detalhes).getByRole('button', { name: 'Marcar como entregue' }))

    expect(avancarPedido).toHaveBeenCalledWith(8)
    const aviso = await within(detalhes).findByText('Pedido entregue e movido para a coluna Entregue.')
    expect(aviso.closest('[role="status"]')).toHaveFocus()
    expect(detalhes).toHaveTextContent('Entregue15/01 às 10:30')
    expect(within(detalhes).getByRole('button', { name: 'Voltar para concluído' })).toBeVisible()
    expect(within(detalhes).queryByRole('button', { name: 'Marcar como entregue' })).not.toBeInTheDocument()
    // Em "Todos", o Entregue fica oculto (ZAP-179): o card aparece escolhendo Entregue no filtro
    expect(screen.queryByRole('region', { name: /Entregue/ })).not.toBeInTheDocument()
    await usuario.click(within(detalhes).getByRole('button', { name: 'Fechar detalhes' }))
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Mostrar' }), '6')
    expect(screen.getByRole('button', { name: 'Pedido 8, Pedro Alves, entregue em 15/01 às 10:30, R$ 200,00' })).toHaveTextContent('Entregue em 15/01 às 10:30')
  })

  test('volta um Entregue para Concluído com confirmação, sem o lembrete do aviso de pronto (ZAP-169)', async () => {
    const usuario = userEvent.setup()
    const detalhes = await abrirPedido(usuario, 7, '/pedidos?status=6')

    expect(within(detalhes).queryByRole('button', { name: /Marcar como/ })).not.toBeInTheDocument()
    expect(within(detalhes).queryByRole('link', { name: 'Editar pedido' })).not.toBeInTheDocument()
    expect(within(detalhes).getByRole('button', { name: 'Apagar dados do cliente' })).toBeEnabled()
    await usuario.click(within(detalhes).getByRole('button', { name: 'Voltar para concluído' }))

    const janela = await screen.findByRole('dialog', { name: 'Voltar o pedido #7 para Concluído?' })
    expect(janela).toHaveTextContent('Ele volta para Concluído, e a data da entrega é apagada.')
    expect(janela).not.toHaveTextContent(/avise pelo WhatsApp/)
    expect(within(janela).getByRole('button', { name: 'Manter como está' })).toHaveFocus()
    await usuario.click(within(janela).getByRole('button', { name: 'Voltar para concluído' }))

    expect(voltarPedido).toHaveBeenCalledWith(7)
    expect(await within(detalhes).findByText('Pedido voltou para a coluna Concluído.')).toBeVisible()
    // Com o filtro em Entregue, o card sai da tela; em "Todos", ele está em Concluído
    await usuario.click(within(detalhes).getByRole('button', { name: 'Fechar detalhes' }))
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Mostrar' }), '')
    const coluna = screen.getByRole('region', { name: /Concluído/ })
    expect(within(coluna).getByRole('button', { name: /Pedido 7, Lia Moraes/ })).toBeInTheDocument()
  })

  test('avisa quando não consegue marcar como pronto e mantém o pedido em produção', async () => {
    const usuario = userEvent.setup()
    avancarPedido.mockRejectedValue(new Error('falhou'))
    const detalhes = await abrirPedido(usuario, 9)

    await usuario.click(within(detalhes).getByRole('button', { name: 'Marcar como pronto' }))

    expect(await within(detalhes).findByRole('alert')).toHaveTextContent('Não foi possível marcar o pedido como pronto agora')
    expect(within(detalhes).getByRole('button', { name: 'Marcar como pronto' })).toBeVisible()
  })
})
