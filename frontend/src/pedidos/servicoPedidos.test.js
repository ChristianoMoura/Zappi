import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dataLocal, STATUS } from './regrasPedidos'
import {
  AcaoNaoPermitidaError,
  anonimizarCliente,
  avancarPedido,
  buscarPedido,
  buscarPedidos,
  cadastrarPedido,
  confirmarPedido,
  editarPedido,
  marcarMensagemEnviada,
  recusarPedido,
  ServicoIndisponivelError,
  SessaoExpiradaError,
  voltarPedido,
} from './servicoPedidos'

// Pedido como o backend devolve (ZAP-44, ZAP-45): status em número, tipos e status das
// mensagens em maiúsculas, datas em UTC e nulos nos campos vazios
const confirmacao = {
  id: 31,
  tipo: 'CONFIRMACAO',
  status: 'ENVIADA',
  texto: 'Olá, Ana!',
  criadoEm: '2026-11-09T13:00:00Z',
  enviadoEm: '2026-11-09T13:05:00Z',
  link: 'https://wa.me/5511900000001?text=Ol%C3%A1',
}
const doBackend = {
  numero: 1,
  status: STATUS.CONFIRMADO,
  dataRetirada: '2026-11-14',
  observacao: null,
  valorTotal: 200,
  cliente: { nome: 'Ana Exemplo', telefone: '5511900000001', anonimizado: false },
  itens: [{ produtoId: 7, produto: 'Bolo', sabor: 'Brigadeiro de chocolate', unidade: 'KG', quantidade: 2, precoUnitario: 100, subtotal: 200, recheio: 'Brigadeiro', cobertura: null, observacao: null }],
  criadoEm: '2026-11-09T12:30:00Z',
  confirmadoEm: '2026-11-09T13:00:00Z',
  producaoEm: null,
  concluidoEm: null,
  recusadoEm: null,
  motivoRecusa: null,
  cancelado: false,
  mensagens: [confirmacao, { ...confirmacao, id: 32, status: 'PENDENTE', enviadoEm: null, texto: 'Olá, Ana! (nova)' }],
}

const json = (status, corpo) => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })

// fetch simulado: responde em ordem e guarda cada chamada
function simularBackend(...respostas) {
  const buscar = vi.fn(async () => respostas.shift() ?? json(500, {}))
  vi.stubGlobal('fetch', buscar)
  return () => buscar.mock.calls
}

// A hora local esperada para uma data em UTC, no fuso de quem roda o teste
const local = (iso) => {
  const data = new Date(iso)
  return `${dataLocal(data)}T${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`
}

describe('servicoPedidos (ZAP-122)', () => {
  beforeEach(() => {
    sessionStorage.setItem('zappi.sessao', JSON.stringify({ token: 'jwt-de-teste', nome: 'Lídia' }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  it('lista todos os pedidos, com os recusados, no formato da tela', async () => {
    const chamadas = simularBackend(json(200, [doBackend]))

    const [pedido] = await buscarPedidos()

    const [[endereco, opcoes]] = chamadas()
    expect(endereco).toBe('/api/pedidos?recusados=true')
    expect(opcoes.headers.Authorization).toBe('Bearer jwt-de-teste')
    expect(pedido).toMatchObject({ numero: 1, status: STATUS.CONFIRMADO, dataRetirada: '2026-11-14', cancelado: false })
    expect(pedido.observacao).toBeUndefined()
    expect(pedido.criadoEm).toBe(local('2026-11-09T12:30:00Z'))
    expect(pedido.confirmadoEm).toBe(local('2026-11-09T13:00:00Z'))
    expect(pedido.producaoEm).toBeUndefined()
    expect(pedido.itens[0]).toEqual({ produtoId: 7, produto: 'Bolo', sabor: 'Brigadeiro de chocolate', unidade: 'KG', quantidade: 2, precoUnitario: 100, recheio: 'Brigadeiro' })
    expect(pedido.mensagens[0]).toEqual({ id: 31, tipo: 'Confirmação', status: 'Enviada', texto: 'Olá, Ana!', link: confirmacao.link, enviadoEm: local('2026-11-09T13:05:00Z') })
    expect(pedido.mensagens[1]).toMatchObject({ id: 32, status: 'Pendente' })
    expect(pedido.mensagens[1].enviadoEm).toBeUndefined()
  })

  it('traduz os tipos de mensagem de recusa e de pronto', async () => {
    simularBackend(json(200, { ...doBackend, mensagens: [{ ...confirmacao, tipo: 'RECUSA' }, { ...confirmacao, tipo: 'PRONTO' }] }))

    const pedido = await buscarPedido(1)

    expect(pedido.mensagens.map((m) => m.tipo)).toEqual(['Recusa', 'Pronto para retirada'])
  })

  it('cliente anonimizado vem com o telefone vazio', async () => {
    simularBackend(json(200, { ...doBackend, cliente: { nome: 'Cliente anonimizado', telefone: null, anonimizado: true } }))

    await expect(buscarPedido(1)).resolves.toMatchObject({ cliente: { nome: 'Cliente anonimizado', telefone: '', anonimizado: true } })
  })

  it('cadastra com um POST do pedido montado pela tela', async () => {
    const chamadas = simularBackend(json(201, { ...doBackend, numero: 3, status: STATUS.NOVO, mensagens: [] }))
    const dados = { cliente: { nome: 'Carla', telefone: '5511988887777' }, consentimentoLgpd: true, dataRetirada: '2026-11-14', observacao: '', itens: [{ produtoId: 7, quantidade: 1 }] }

    const salvo = await cadastrarPedido(dados)

    expect(salvo).toMatchObject({ numero: 3, status: STATUS.NOVO, mensagens: [] })
    const [[endereco, opcoes]] = chamadas()
    expect(endereco).toBe('/api/pedidos')
    expect(opcoes.method).toBe('POST')
    expect(JSON.parse(opcoes.body)).toEqual(dados)
  })

  it('edita com um PUT no número do pedido', async () => {
    const chamadas = simularBackend(json(200, doBackend))

    await editarPedido(1, { itens: [] })

    const [[endereco, opcoes]] = chamadas()
    expect(endereco).toBe('/api/pedidos/1')
    expect(opcoes.method).toBe('PUT')
  })

  it('confirma e recusa pelas rotas do pedido, com o motivo sem espaços nas pontas', async () => {
    const chamadas = simularBackend(json(200, doBackend), json(200, { ...doBackend, status: STATUS.RECUSADO }))

    await confirmarPedido(1)
    await recusarPedido(1, '  Agenda cheia.  ')

    const [[confirmar, opcoesConfirmar], [recusar, opcoesRecusar]] = chamadas()
    expect(confirmar).toBe('/api/pedidos/1/confirmar')
    expect(opcoesConfirmar.method).toBe('POST')
    expect(recusar).toBe('/api/pedidos/1/recusar')
    expect(JSON.parse(opcoesRecusar.body)).toEqual({ motivo: 'Agenda cheia.' })
  })

  it.each([
    [STATUS.CONFIRMADO, avancarPedido, 'iniciar-producao'],
    [STATUS.EM_PRODUCAO, avancarPedido, 'concluir'],
    [STATUS.EM_PRODUCAO, voltarPedido, 'voltar-para-confirmado'],
    [STATUS.CONCLUIDO, voltarPedido, 'voltar-para-producao'],
  ])('com o pedido no status %i, escolhe a rota pelo status atual', async (status, acao, rota) => {
    const chamadas = simularBackend(json(200, { ...doBackend, status }), json(200, doBackend))

    await acao(1)

    const [[leitura], [endereco, opcoes]] = chamadas()
    expect(leitura).toBe('/api/pedidos/1')
    expect(endereco).toBe(`/api/pedidos/1/${rota}`)
    expect(opcoes.method).toBe('POST')
  })

  it('não avança um pedido Novo nem volta um Confirmado', async () => {
    simularBackend(json(200, { ...doBackend, status: STATUS.NOVO }), json(200, doBackend))

    await expect(avancarPedido(1)).rejects.toBeInstanceOf(AcaoNaoPermitidaError)
    await expect(voltarPedido(1)).rejects.toBeInstanceOf(AcaoNaoPermitidaError)
  })

  it('marca como enviada a mensagem pela posição dela no pedido', async () => {
    const chamadas = simularBackend(json(200, doBackend), json(200, doBackend))

    await marcarMensagemEnviada(1, 1)

    const [, [endereco, opcoes]] = chamadas()
    expect(endereco).toBe('/api/pedidos/1/mensagens/32/enviada')
    expect(opcoes.method).toBe('POST')
  })

  it('mensagem que não existe no pedido não é marcada', async () => {
    const chamadas = simularBackend(json(200, doBackend))

    await expect(marcarMensagemEnviada(1, 5)).rejects.toBeInstanceOf(AcaoNaoPermitidaError)
    expect(chamadas()).toHaveLength(1)
  })

  it.each([400, 404, 409])('a resposta %i vira AcaoNaoPermitidaError', async (status) => {
    simularBackend(json(status, { codigo: 'ERRO' }))

    await expect(confirmarPedido(1)).rejects.toBeInstanceOf(AcaoNaoPermitidaError)
  })

  it('anonimiza pela rota do pedido e devolve o cliente sem telefone', async () => {
    const chamadas = simularBackend(json(200, { ...doBackend, status: STATUS.CONCLUIDO, cliente: { nome: 'Cliente anonimizado', telefone: null, anonimizado: true } }))

    const pedido = await anonimizarCliente(1)

    const [[endereco, opcoes]] = chamadas()
    expect(endereco).toBe('/api/pedidos/1/anonimizar-cliente')
    expect(opcoes.method).toBe('POST')
    expect(pedido.cliente).toEqual({ nome: 'Cliente anonimizado', telefone: '', anonimizado: true })
  })

  it.each([
    ['CLIENTE_COM_PEDIDO_EM_ABERTO', 'Este cliente ainda tem pedido em andamento.'],
    ['CLIENTE_JA_ANONIMIZADO', 'Os dados deste cliente já foram apagados.'],
  ])('o 409 %s traz o motivo do backend', async (codigo, mensagem) => {
    simularBackend(json(409, { codigo, mensagem }))

    const erro = await anonimizarCliente(1).catch((e) => e)

    expect(erro).toBeInstanceOf(AcaoNaoPermitidaError)
    expect(erro.message).toBe(mensagem)
  })

  it('o 409 sem corpo continua virando AcaoNaoPermitidaError, sem motivo', async () => {
    simularBackend(new Response('', { status: 409 }))

    const erro = await anonimizarCliente(1).catch((e) => e)

    expect(erro).toBeInstanceOf(AcaoNaoPermitidaError)
    expect(erro.message).toBe('')
  })

  it('erro do servidor ou sem conexão vira ServicoIndisponivelError', async () => {
    simularBackend(json(500, {}))
    await expect(buscarPedidos()).rejects.toBeInstanceOf(ServicoIndisponivelError)

    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    }))
    await expect(buscarPedidos()).rejects.toBeInstanceOf(ServicoIndisponivelError)
  })

  it('token vencido encerra a sessão', async () => {
    const irPara = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign: irPara })
    simularBackend(json(401, {}))

    await expect(buscarPedidos()).rejects.toBeInstanceOf(SessaoExpiradaError)
    expect(sessionStorage.getItem('zappi.sessao')).toBeNull()
    expect(irPara).toHaveBeenCalledWith('/login')
  })
})
