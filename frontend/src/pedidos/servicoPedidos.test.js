import { describe, expect, test } from 'vitest'
import { STATUS } from './regrasPedidos'
import { AcaoNaoPermitidaError, buscarPedidos, confirmarPedido, marcarMensagemEnviada } from './servicoPedidos'

// Simulação usada em desenvolvimento até as APIs da ZAP-44, ZAP-49 e ZAP-50
describe('serviço simulado de pedidos', () => {
  test('confirma um pedido Novo com a mensagem do modelo aprovado e não confirma duas vezes', async () => {
    const novo = (await buscarPedidos()).find((p) => p.status === STATUS.NOVO)

    const confirmado = await confirmarPedido(novo.numero)

    expect(confirmado.status).toBe(STATUS.CONFIRMADO)
    expect(confirmado.confirmadoEm).toBeTruthy()
    const [mensagem] = confirmado.mensagens
    expect(mensagem).toMatchObject({ tipo: 'Confirmação', status: 'Pendente' })
    expect(mensagem.texto).toMatch(new RegExp(`^Olá, ${novo.cliente.nome.split(' ')[0]}!`))
    expect(mensagem.texto).toMatch(/Mensagem gerada pelo Zappi$/)
    expect(mensagem.link).toBe(`https://wa.me/?text=${encodeURIComponent(mensagem.texto)}`)
    await expect(confirmarPedido(novo.numero)).rejects.toBeInstanceOf(AcaoNaoPermitidaError)
  })

  test('marcar como enviada guarda a data do primeiro envio', async () => {
    const pedido = (await buscarPedidos()).find((p) => p.mensagens.some((m) => m.status === 'Pendente'))
    const indice = pedido.mensagens.findIndex((m) => m.status === 'Pendente')

    const primeiro = await marcarMensagemEnviada(pedido.numero, indice)
    const segundo = await marcarMensagemEnviada(pedido.numero, indice)

    expect(primeiro.mensagens[indice].status).toBe('Enviada')
    expect(segundo.mensagens[indice].enviadoEm).toBe(primeiro.mensagens[indice].enviadoEm)
  })
})
