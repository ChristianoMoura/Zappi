import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { STATUS } from '../pedidos/regrasPedidos'
import { buscarPedidos, recusarPedido } from '../pedidos/servicoPedidos'
import { abrirPedido, mensagemDeTeste, pedidoDeTeste, usarTela } from '../testes/pedidosDeTeste'

// O backend é simulado aqui para os testes não dependerem da ZAP-53
vi.mock('../pedidos/servicoPedidos', async (importarOriginal) => ({
  ...(await importarOriginal()),
  buscarPedidos: vi.fn(),
  recusarPedido: vi.fn(),
}))

const mensagem = mensagemDeTeste
const pedido = pedidoDeTeste

const enviada = mensagem('Confirmação', { status: 'Enviada', enviadoEm: '2030-01-10T12:00' })
const pedidos = [
  pedido(12, STATUS.NOVO, 'Ana Souza'),
  pedido(11, STATUS.CONFIRMADO, 'João Pereira', { confirmadoEm: '2030-01-10T12:00', mensagens: [enviada] }),
  pedido(9, STATUS.EM_PRODUCAO, 'Beatriz Rocha', { mensagens: [enviada] }),
  pedido(8, STATUS.CONCLUIDO, 'Pedro Alves', { mensagens: [enviada, mensagem('Pronto para retirada')] }),
]

const recusado = (original, motivo) => ({
  ...original,
  status: STATUS.RECUSADO,
  cancelado: original.status !== STATUS.NOVO,
  motivoRecusa: motivo,
  recusadoEm: '2030-01-11T09:00',
  mensagens: [...original.mensagens, mensagem('Recusa')],
})

async function abrirJanela(usuario, detalhes, botao, titulo) {
  await usuario.click(within(detalhes).getByRole('button', { name: botao }))
  return screen.findByRole('dialog', { name: titulo })
}

describe('Recusar e cancelar pedido (ZAP-54, RF11, RN05)', () => {
  beforeEach(() => {
    usarTela(true)
    buscarPedidos.mockReset().mockResolvedValue(pedidos)
    recusarPedido.mockReset().mockImplementation(async (numero, motivo) => recusado(pedidos.find((p) => p.numero === numero), motivo))
  })

  afterEach(() => usarTela(false))

  test('recusa o pedido Novo com motivo, mostra os recusados e leva o foco para enviar a mensagem', async () => {
    const usuario = userEvent.setup()
    const detalhes = await abrirPedido(usuario, 12)
    const janela = await abrirJanela(usuario, detalhes, 'Recusar pedido', 'Recusar pedido #12')
    const campo = within(janela).getByRole('textbox', { name: /Motivo/ })

    await usuario.type(campo, '  Agenda cheia nesse dia.  ')
    await usuario.click(within(janela).getByRole('button', { name: 'Recusar pedido' }))

    expect(recusarPedido).toHaveBeenCalledWith(12, 'Agenda cheia nesse dia.')
    expect(await within(detalhes).findByText(/Pedido recusado e movido para a coluna Recusado/)).toBeVisible()
    expect(within(detalhes).getByText('Motivo da recusa:')).toBeVisible()
    expect(within(detalhes).getByRole('link', { name: /Enviar no WhatsApp para Ana/ })).toHaveFocus()
    expect(screen.getByRole('switch', { name: 'Mostrar recusados' })).toBeChecked()
    const coluna = screen.getByRole('region', { name: /Recusado/ })
    expect(within(coluna).getByRole('button', { name: /Pedido 12, Ana Souza/ })).toBeInTheDocument()
  })

  test('não recusa sem motivo e explica o que falta', async () => {
    const usuario = userEvent.setup()
    const detalhes = await abrirPedido(usuario, 12)
    const janela = await abrirJanela(usuario, detalhes, 'Recusar pedido', 'Recusar pedido #12')

    await usuario.type(within(janela).getByRole('textbox', { name: /Motivo/ }), '   ')
    await usuario.click(within(janela).getByRole('button', { name: 'Recusar pedido' }))

    expect(recusarPedido).not.toHaveBeenCalled()
    expect(within(janela).getByText('Escreva o motivo. Ana vai receber essa explicação no WhatsApp.')).toBeVisible()
    expect(within(janela).getByRole('textbox', { name: /Motivo/ })).toHaveAttribute('aria-invalid', 'true')
  })

  test('o botão Voltar fecha a janela sem mudar o pedido', async () => {
    const usuario = userEvent.setup()
    const detalhes = await abrirPedido(usuario, 12)
    const janela = await abrirJanela(usuario, detalhes, 'Recusar pedido', 'Recusar pedido #12')

    await usuario.click(within(janela).getByRole('button', { name: 'Voltar' }))

    expect(recusarPedido).not.toHaveBeenCalled()
    expect(within(detalhes).getByRole('button', { name: 'Confirmar pedido' })).toBeVisible()
  })

  test('cancela o pedido Confirmado com motivo', async () => {
    const usuario = userEvent.setup()
    const detalhes = await abrirPedido(usuario, 11)
    const janela = await abrirJanela(usuario, detalhes, 'Cancelar pedido', 'Cancelar pedido #11')

    await usuario.type(within(janela).getByRole('textbox', { name: /Motivo/ }), 'Faltou ingrediente.')
    await usuario.click(within(janela).getByRole('button', { name: 'Cancelar pedido' }))

    expect(recusarPedido).toHaveBeenCalledWith(11, 'Faltou ingrediente.')
    expect(await within(detalhes).findByText(/Pedido cancelado e movido para a coluna Recusado/)).toBeVisible()
    expect(within(detalhes).getByText('Motivo do cancelamento:')).toBeVisible()
    expect(within(detalhes).getByText('Cancelado')).toBeVisible()
  })

  test('avisa quando não consegue cancelar e deixa a janela aberta com o motivo', async () => {
    const usuario = userEvent.setup()
    recusarPedido.mockRejectedValue(new Error('falhou'))
    const detalhes = await abrirPedido(usuario, 9)
    const janela = await abrirJanela(usuario, detalhes, 'Cancelar pedido', 'Cancelar pedido #9')

    await usuario.type(within(janela).getByRole('textbox', { name: /Motivo/ }), 'Forno quebrou.')
    await usuario.click(within(janela).getByRole('button', { name: 'Cancelar pedido' }))

    expect(await within(janela).findByRole('alert')).toHaveTextContent('Não foi possível cancelar o pedido agora')
    expect(within(janela).getByRole('textbox', { name: /Motivo/ })).toHaveValue('Forno quebrou.')
  })

  test('pedido Concluído não pode ser recusado nem cancelado', async () => {
    const usuario = userEvent.setup()
    const detalhes = await abrirPedido(usuario, 8)

    expect(within(detalhes).queryByRole('button', { name: /Recusar pedido|Cancelar pedido/ })).not.toBeInTheDocument()
  })
})
