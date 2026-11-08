import { describe, expect, test } from 'vitest'
import { STATUS } from './regrasPedidos'
import { AcaoNaoPermitidaError, buscarPedidos, confirmarPedido, marcarMensagemEnviada, recusarPedido } from './servicoPedidos'

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

  test('recusa um pedido Novo com o motivo e a mensagem de recusa pendente', async () => {
    const novo = (await buscarPedidos()).find((p) => p.status === STATUS.NOVO)

    await expect(recusarPedido(novo.numero, '   ')).rejects.toBeInstanceOf(AcaoNaoPermitidaError)
    await expect(recusarPedido(novo.numero, 'x'.repeat(501))).rejects.toBeInstanceOf(AcaoNaoPermitidaError)
    const recusado = await recusarPedido(novo.numero, '  Agenda cheia nesse dia.  ')

    expect(recusado).toMatchObject({ status: STATUS.RECUSADO, cancelado: false, motivoRecusa: 'Agenda cheia nesse dia.' })
    expect(recusado.recusadoEm).toBeTruthy()
    const recusa = recusado.mensagens.at(-1)
    expect(recusa).toMatchObject({ tipo: 'Recusa', status: 'Pendente' })
    expect(recusa.texto).toContain('Motivo: Agenda cheia nesse dia.')
  })

  test('cancela um pedido Em produção, mas não um Concluído nem um já recusado', async () => {
    const lista = await buscarPedidos()
    const emProducao = lista.find((p) => p.status === STATUS.EM_PRODUCAO)

    const cancelado = await recusarPedido(emProducao.numero, 'Faltou ingrediente.')

    expect(cancelado).toMatchObject({ status: STATUS.RECUSADO, cancelado: true })
    await expect(recusarPedido(emProducao.numero, 'De novo')).rejects.toBeInstanceOf(AcaoNaoPermitidaError)
    const concluido = lista.find((p) => p.status === STATUS.CONCLUIDO)
    await expect(recusarPedido(concluido.numero, 'Motivo')).rejects.toBeInstanceOf(AcaoNaoPermitidaError)
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
