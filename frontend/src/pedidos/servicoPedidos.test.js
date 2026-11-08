import { describe, expect, test } from 'vitest'
import { STATUS } from './regrasPedidos'
import { AcaoNaoPermitidaError, avancarPedido, buscarPedidos, cadastrarPedido, confirmarPedido, marcarMensagemEnviada, recusarPedido, voltarPedido } from './servicoPedidos'

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

  test('avança Confirmado até Concluído, gerando o aviso de pronto, e volta só uma coluna', async () => {
    const confirmado = (await buscarPedidos()).find((p) => p.status === STATUS.CONFIRMADO)

    const emProducao = await avancarPedido(confirmado.numero)
    expect(emProducao).toMatchObject({ status: STATUS.EM_PRODUCAO })
    expect(emProducao.producaoEm).toBeTruthy()

    const pronto = await avancarPedido(confirmado.numero)
    expect(pronto.status).toBe(STATUS.CONCLUIDO)
    expect(pronto.mensagens.at(-1)).toMatchObject({ tipo: 'Pronto para retirada', status: 'Pendente' })
    await expect(avancarPedido(confirmado.numero)).rejects.toBeInstanceOf(AcaoNaoPermitidaError)

    const voltou = await voltarPedido(confirmado.numero)
    expect(voltou.status).toBe(STATUS.EM_PRODUCAO)
    expect(voltou.concluidoEm).toBeUndefined()
    expect((await voltarPedido(confirmado.numero)).status).toBe(STATUS.CONFIRMADO)
    await expect(voltarPedido(confirmado.numero)).rejects.toBeInstanceOf(AcaoNaoPermitidaError)
  })

  test('cadastra o pedido como Novo com o próximo número, e não grava sem consentimento (RN03, RN09, RN16)', async () => {
    const maior = Math.max(...(await buscarPedidos()).map((p) => p.numero))
    const dados = {
      cliente: { nome: 'Fernanda Costa', telefone: '5511987650099' },
      consentimentoLgpd: true,
      dataRetirada: '2030-01-15',
      observacao: '',
      itens: [{ produtoId: 1, produto: 'Bolo', sabor: 'Brigadeiro de chocolate', unidade: 'KG', quantidade: 2, precoUnitario: 100 }],
    }

    const pedido = await cadastrarPedido(dados)

    expect(pedido).toMatchObject({ numero: maior + 1, status: STATUS.NOVO, mensagens: [] })
    expect(pedido.observacao).toBeUndefined()
    expect((await buscarPedidos()).some((p) => p.numero === pedido.numero)).toBe(true)
    await expect(cadastrarPedido({ ...dados, consentimentoLgpd: false })).rejects.toBeInstanceOf(AcaoNaoPermitidaError)
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
