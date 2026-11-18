import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { STATUS } from '../pedidos/regrasPedidos'
import { buscarPedidos } from '../pedidos/servicoPedidos'
import { abrirPedido, abrirQuadro, pedidoDeTeste, usarTela } from '../testes/pedidosDeTeste'

vi.mock('../pedidos/servicoPedidos', async (importarOriginal) => ({ ...(await importarOriginal()), buscarPedidos: vi.fn() }))

// Cada pedido guarda o nome do cliente (ZAP-199, ZAP-202): o mesmo WhatsApp pode ter pedidos com
// nomes diferentes, e cada um aparece com o seu
const daAna = pedidoDeTeste(21, STATUS.NOVO, 'Ana Souza')
const daAnaPaula = pedidoDeTeste(22, STATUS.CONFIRMADO, 'Ana Paula Souza')

describe('nome do cliente em cada pedido (ZAP-202)', () => {
  beforeEach(() => {
    usarTela(true)
    buscarPedidos.mockReset().mockResolvedValue([daAna, daAnaPaula])
  })

  afterEach(() => usarTela(false))

  test('dois pedidos do mesmo WhatsApp mostram, cada um, o seu nome no quadro', async () => {
    await abrirQuadro()

    expect(daAna.cliente.telefone).toBe(daAnaPaula.cliente.telefone)
    expect(screen.getByRole('button', { name: /Pedido 21, Ana Souza,/, hidden: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pedido 22, Ana Paula Souza,/, hidden: true })).toBeInTheDocument()
  })

  test('nos detalhes, cada pedido mostra o seu nome com o mesmo WhatsApp', async () => {
    const usuario = userEvent.setup()

    const detalhes22 = await abrirPedido(usuario, 22)
    expect(within(detalhes22).getByText('Ana Paula Souza')).toBeVisible()
    expect(within(detalhes22).getByText('(11) 98765-0000')).toBeVisible()
    expect(within(detalhes22).queryByText('Ana Souza')).not.toBeInTheDocument()
  })
})
