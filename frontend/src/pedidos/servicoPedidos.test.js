import { describe, expect, test } from 'vitest'
import { STATUS } from './regrasPedidos'
import { AcaoNaoPermitidaError, avancarPedido, buscarPedidos, cadastrarPedido, confirmarPedido, editarPedido, marcarMensagemEnviada, recusarPedido, voltarPedido } from './servicoPedidos'

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

  describe('edição (ZAP-91, RN21)', () => {
    const itemNovo = { produto: 'Bolo', sabor: 'Ninho com morango', unidade: 'KG', quantidade: 3, precoUnitario: 115 }
    const novoPedido = (nome) =>
      cadastrarPedido({ cliente: { nome, telefone: '5511987650098' }, consentimentoLgpd: true, dataRetirada: '2030-01-15', observacao: 'Festa', itens: [{ ...itemNovo, quantidade: 1 }] })

    test('no Novo muda o cliente e os itens, e não mexe nas mensagens', async () => {
      const { numero, cliente } = await novoPedido('Maria Lima')

      const editado = await editarPedido(numero, { cliente: { nome: 'Maria Souza', telefone: cliente.telefone }, dataRetirada: '2030-01-20', observacao: '', itens: [itemNovo] })

      expect(editado).toMatchObject({ cliente: { nome: 'Maria Souza' }, dataRetirada: '2030-01-20', itens: [{ quantidade: 3 }], mensagens: [] })
      expect(editado.observacao).toBeUndefined()
    })

    test('depois de confirmado, recusa trocar de cliente e refaz a confirmação que ainda não foi enviada', async () => {
      const { numero, cliente } = await novoPedido('Paula Dias')
      await confirmarPedido(numero)

      await expect(editarPedido(numero, { cliente: { nome: 'Outra', telefone: '5511900000000' }, dataRetirada: '2030-01-15', observacao: '', itens: [itemNovo] })).rejects.toBeInstanceOf(AcaoNaoPermitidaError)
      const editado = await editarPedido(numero, { cliente, dataRetirada: '2030-01-15', observacao: '', itens: [itemNovo] })

      expect(editado.mensagens).toHaveLength(1)
      expect(editado.mensagens[0].status).toBe('Pendente')
      expect(editado.mensagens[0].texto).toContain('(3 kg)')
    })

    test('se a confirmação já foi enviada, guarda ela e cria uma nova só quando algo mudou', async () => {
      const { numero, cliente } = await novoPedido('Rosa Melo')
      await confirmarPedido(numero)
      await marcarMensagemEnviada(numero, 0)
      const igual = { cliente, dataRetirada: '2030-01-15', observacao: 'Festa', itens: [{ ...itemNovo, quantidade: 1 }] }

      expect((await editarPedido(numero, igual)).mensagens).toHaveLength(1)
      const editado = await editarPedido(numero, { ...igual, itens: [itemNovo] })

      expect(editado.mensagens.map((m) => m.status)).toEqual(['Enviada', 'Pendente'])
    })

    test('não edita pedido Concluído nem Recusado', async () => {
      const lista = await buscarPedidos()
      const concluido = lista.find((p) => p.status === STATUS.CONCLUIDO)
      await expect(editarPedido(concluido.numero, { cliente: concluido.cliente, dataRetirada: '2030-01-15', observacao: '', itens: [itemNovo] })).rejects.toBeInstanceOf(AcaoNaoPermitidaError)
    })
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
