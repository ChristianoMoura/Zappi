// Leitura dos pedidos do estabelecimento da usuária logada e as ações sobre eles.
// PENDENTE: as APIs são a ZAP-44 (listar), a ZAP-49 (confirmar), a ZAP-53 (recusar e cancelar),
// a ZAP-75 e a ZAP-76 (andamento e voltar coluna), a ZAP-88 e a ZAP-90 (cadastrar e editar) e a ZAP-50 (texto da mensagem, link wa.me e marcar
// como enviada), que ainda não existem. Enquanto isso, no modo de
// desenvolvimento os pedidos são simulados com clientes fictícios (nenhum dado real), guardados
// só na memória; fora dele, a tela avisa que o serviço não está disponível.
// Quando as APIs ficarem prontas, só este arquivo muda.

import { AVANCO, dataLocal, dataRetiradaMensagem, moeda, MOTIVO_MAXIMO, nomeItem, podeEditar, podeRecusarOuCancelar, podeTrocarCliente, quantidadeTexto, STATUS, totalPedido, VOLTA } from './regrasPedidos'

export class ServicoIndisponivelError extends Error {}
export class AcaoNaoPermitidaError extends Error {}

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms))

// Datas relativas a hoje, para o quadro sempre ter pedidos de hoje e dos próximos dias
function dia(deslocamento, hora) {
  const data = new Date()
  data.setDate(data.getDate() + deslocamento)
  return hora ? `${dataLocal(data)}T${hora}` : dataLocal(data)
}

function agora() {
  const data = new Date()
  return `${dataLocal(data)}T${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`
}

// Textos aprovados na ZAP-63 (docs/mensagens-whatsapp.md). No sistema real, quem monta é o backend (ZAP-50).
function textoMensagem(pedido, tipo) {
  const nome = pedido.cliente.nome.split(' ')[0]
  if (tipo === 'Confirmação') {
    const itens = pedido.itens.map((item) => `- ${nomeItem(item)} (${quantidadeTexto(item)})`).join('\n')
    return `Olá, ${nome}!\n\nSeu pedido #${pedido.numero} na Casa Belt está confirmado.\n\n${itens}\nTotal: ${moeda(totalPedido(pedido))}\nRetirada: ${dataRetiradaMensagem(pedido.dataRetirada)}\n\nO pagamento é feito na retirada. Qualquer dúvida, é só responder esta mensagem.\n\nMensagem gerada pelo Zappi`
  }
  if (tipo === 'Recusa') {
    return `Olá, ${nome}.\n\nInfelizmente não vamos conseguir atender o seu pedido #${pedido.numero} para ${dataRetiradaMensagem(pedido.dataRetirada)}.\n\nMotivo: ${pedido.motivoRecusa}\n\nSe quiser combinar outra data ou outro pedido, é só responder esta mensagem.\n\nCasa Belt\nMensagem gerada pelo Zappi`
  }
  return `Olá, ${nome}!\n\nSeu pedido #${pedido.numero} está pronto para retirada.\n\nRetirada: ${dataRetiradaMensagem(pedido.dataRetirada)}\nTotal a pagar na retirada: ${moeda(totalPedido(pedido))}\n\nQualquer dúvida, é só responder esta mensagem.\n\nCasa Belt\nMensagem gerada pelo Zappi`
}

// No sistema real o link leva o telefone do cliente (wa.me/<telefone>?text=...). Na simulação ele vai
// sem telefone, para o WhatsApp pedir o contato: os números fictícios podem ser de alguém de verdade.
const linkSimulado = (texto) => `https://wa.me/?text=${encodeURIComponent(texto)}`

function mensagem(pedido, tipo, enviadoEm) {
  const texto = textoMensagem(pedido, tipo)
  return { tipo, status: enviadoEm ? 'Enviada' : 'Pendente', enviadoEm, texto, link: linkSimulado(texto) }
}

// Campos com os nomes da tela; a ZAP-44 converte das colunas de `pedido`, `item_pedido`,
// `cliente` e `mensagem_whatsapp`. Preços do cardápio da Casa Belt (seção 2.2 do context.md).
const bolo = (sabor, quantidade, precoUnitario, extras = {}) => ({ produto: 'Bolo', sabor, unidade: 'KG', quantidade, precoUnitario, ...extras })
const salgado = (sabor, quantidade, precoUnitario) => ({ produto: 'Salgado', sabor, unidade: 'UN', quantidade, precoUnitario })

function pedidosSimulados() {
  const pedidos = [
    {
      numero: 13, status: STATUS.NOVO, dataRetirada: dia(8), criadoEm: dia(-1, '19:12'),
      cliente: { nome: 'Marcos Lima', telefone: '5511987650013' }, observacao: 'Aniversário de 40 anos',
      itens: [bolo('Ninho com morango', 1.5, 115, { recheio: 'Ninho com morango', cobertura: 'Chantilly' })],
      mensagens: [],
    },
    {
      numero: 12, status: STATUS.NOVO, dataRetirada: dia(7), criadoEm: dia(-1, '10:40'),
      cliente: { nome: 'Ana Souza', telefone: '5511987650012' }, observacao: 'Festa infantil, tema fundo do mar',
      itens: [bolo('Brigadeiro de chocolate', 2, 100, { recheio: 'Brigadeiro', cobertura: 'Granulado' })],
      mensagens: [],
    },
    {
      numero: 11, status: STATUS.CONFIRMADO, dataRetirada: dia(7), criadoEm: dia(-2, '16:03'), confirmadoEm: dia(-2, '18:20'),
      cliente: { nome: 'João Pereira', telefone: '5511987650011' },
      itens: [bolo('Brigadeiro de chocolate', 3, 100, { recheio: 'Brigadeiro com morango', cobertura: 'Ganache' })],
      mensagens: [['Confirmação']],
    },
    {
      numero: 10, status: STATUS.CONFIRMADO, dataRetirada: dia(6), criadoEm: dia(-3, '09:15'), confirmadoEm: dia(-3, '12:00'),
      cliente: { nome: 'Carla Dias', telefone: '5511987650010' }, observacao: 'Para o escritório',
      itens: [salgado('Coxinha de frango', 100, 1.2)],
      mensagens: [['Confirmação', dia(-3, '12:02')]],
    },
    {
      numero: 9, status: STATUS.EM_PRODUCAO, dataRetirada: dia(0), criadoEm: dia(-5, '14:30'), confirmadoEm: dia(-5, '17:45'), producaoEm: dia(-1, '08:00'),
      cliente: { nome: 'Beatriz Rocha', telefone: '5511987650009' },
      itens: [bolo('Ninho com morango', 2, 115, { recheio: 'Ninho com morango', cobertura: 'Chantilly', observacao: 'Escrever "Parabéns, Lia"' })],
      mensagens: [['Confirmação', dia(-5, '17:50')]],
    },
    {
      numero: 8, status: STATUS.CONCLUIDO, dataRetirada: dia(0), criadoEm: dia(-6, '11:00'), confirmadoEm: dia(-6, '13:10'), producaoEm: dia(-1, '07:30'), concluidoEm: dia(0, '08:30'),
      cliente: { nome: 'Pedro Alves', telefone: '5511987650008' },
      itens: [bolo('Brigadeiro de chocolate', 1, 100, { recheio: 'Brigadeiro', cobertura: 'Granulado' })],
      mensagens: [['Confirmação', dia(-6, '13:15')], ['Pronto para retirada']],
    },
    {
      numero: 7, status: STATUS.RECUSADO, dataRetirada: dia(1), criadoEm: dia(-4, '20:05'), recusadoEm: dia(-3, '08:10'),
      cliente: { nome: 'Rita Gomes', telefone: '5511987650007' }, motivoRecusa: 'Agenda cheia nesse dia. Posso fazer para o dia seguinte.',
      itens: [bolo('Ninho com morango', 4, 115, { recheio: 'Ninho com morango', cobertura: 'Chantilly' })],
      mensagens: [['Recusa', dia(-3, '08:12')]],
    },
    {
      numero: 6, status: STATUS.RECUSADO, dataRetirada: dia(-2), criadoEm: dia(-3, '22:40'), recusadoEm: dia(-2, '07:30'),
      cliente: { nome: 'Lucas Moreira', telefone: '5511987650006' }, motivoRecusa: 'Pedido feito com menos de 2 dias de antecedência.',
      itens: [salgado('Coxinha de frango', 200, 1.2)],
      mensagens: [['Recusa', dia(-2, '07:32')]],
    },
  ]
  return pedidos.map((pedido) => ({ ...pedido, mensagens: pedido.mensagens.map(([tipo, enviadoEm]) => mensagem(pedido, tipo, enviadoEm)) }))
}

let simulados = null
const copia = (valor) => structuredClone(valor)

function encontrar(numero) {
  simulados ??= pedidosSimulados()
  const pedido = simulados.find((p) => p.numero === numero)
  if (!pedido) throw new AcaoNaoPermitidaError()
  return pedido
}

export async function buscarPedidos() {
  if (!import.meta.env.DEV) throw new ServicoIndisponivelError()
  await esperar(400)
  simulados ??= pedidosSimulados()
  return copia(simulados)
}

// Cadastro de pedido pela Lídia (ZAP-89, US7, RF13). O pedido começa como Novo (RN03) e recebe
// o próximo número do estabelecimento; na API (ZAP-88), por MAX + 1 com bloqueio (RN09). Os itens
// chegam com o preço do cardápio, que fica congelado no pedido (RN10). Sem o consentimento do
// cliente, o pedido não é gravado (RN16).
export async function cadastrarPedido(dados) {
  if (!import.meta.env.DEV) throw new ServicoIndisponivelError()
  await esperar(700)
  if (!dados.consentimentoLgpd || dados.itens.length === 0) throw new AcaoNaoPermitidaError()
  simulados ??= pedidosSimulados()
  const pedido = {
    numero: Math.max(0, ...simulados.map((p) => p.numero)) + 1,
    status: STATUS.NOVO,
    dataRetirada: dados.dataRetirada,
    criadoEm: agora(),
    cliente: { nome: dados.cliente.nome, telefone: dados.cliente.telefone },
    ...(dados.observacao ? { observacao: dados.observacao } : {}),
    itens: dados.itens.map((item) => ({ ...item })),
    mensagens: [],
  }
  simulados.push(pedido)
  return copia(pedido)
}

export async function buscarPedido(numero) {
  if (!import.meta.env.DEV) throw new ServicoIndisponivelError()
  await esperar(300)
  return copia(encontrar(numero))
}

// Depois que o pedido muda, a confirmação não pode ficar com dados antigos: a pendente é
// refeita; se a última já foi enviada, entra uma nova para a Lídia enviar (ZAP-91)
function atualizarConfirmacao(pedido) {
  const indice = pedido.mensagens.findLastIndex((m) => m.tipo === 'Confirmação')
  const nova = mensagem(pedido, 'Confirmação')
  const ultima = pedido.mensagens[indice]
  if (!ultima || ultima.texto === nova.texto) return
  if (ultima.status === 'Pendente') pedido.mensagens[indice] = nova
  else pedido.mensagens.push(nova)
}

// Edição do pedido conforme o status (ZAP-91, RF14, RN21). Depois de confirmado, o cliente não
// troca. Os itens chegam com o preço já resolvido: o da época ou o atual, nos novos (RN10).
export async function editarPedido(numero, dados) {
  if (!import.meta.env.DEV) throw new ServicoIndisponivelError()
  await esperar(700)
  const pedido = encontrar(numero)
  if (!podeEditar(pedido.status) || dados.itens.length === 0) throw new AcaoNaoPermitidaError()
  if (podeTrocarCliente(pedido.status)) pedido.cliente = { nome: dados.cliente.nome, telefone: dados.cliente.telefone }
  else if (dados.cliente.telefone !== pedido.cliente.telefone) throw new AcaoNaoPermitidaError()
  pedido.dataRetirada = dados.dataRetirada
  pedido.itens = dados.itens.map((item) => ({ ...item }))
  if (dados.observacao) pedido.observacao = dados.observacao
  else delete pedido.observacao
  if (pedido.status === STATUS.CONFIRMADO) atualizarConfirmacao(pedido)
  return copia(pedido)
}

// Novo → Confirmado, gerando a mensagem de confirmação pendente (RN03, RN06, RN07)
export async function confirmarPedido(numero) {
  if (!import.meta.env.DEV) throw new ServicoIndisponivelError()
  await esperar(600)
  const pedido = encontrar(numero)
  if (pedido.status !== STATUS.NOVO) throw new AcaoNaoPermitidaError()
  pedido.status = STATUS.CONFIRMADO
  pedido.confirmadoEm = agora()
  pedido.mensagens.push(mensagem(pedido, 'Confirmação'))
  return copia(pedido)
}

// Recusa um pedido Novo ou cancela um Confirmado ou Em produção: o pedido vai para Recusado,
// com o motivo, e ganha a mensagem de recusa pendente (RN03, RN05, RN06, RN07, ZAP-64)
export async function recusarPedido(numero, motivo) {
  if (!import.meta.env.DEV) throw new ServicoIndisponivelError()
  await esperar(600)
  const pedido = encontrar(numero)
  const texto = motivo.trim()
  if (!podeRecusarOuCancelar(pedido.status) || !texto || texto.length > MOTIVO_MAXIMO) throw new AcaoNaoPermitidaError()
  pedido.cancelado = pedido.status !== STATUS.NOVO
  pedido.status = STATUS.RECUSADO
  pedido.motivoRecusa = texto
  pedido.recusadoEm = agora()
  pedido.mensagens.push(mensagem(pedido, 'Recusa'))
  return copia(pedido)
}

// Confirmado → Em produção e Em produção → Concluído. Ao concluir, gera o aviso de pronto
// pendente (RN03, RN06, ZAP-77)
export async function avancarPedido(numero) {
  if (!import.meta.env.DEV) throw new ServicoIndisponivelError()
  await esperar(600)
  const pedido = encontrar(numero)
  const avanco = AVANCO[pedido.status]
  if (!avanco) throw new AcaoNaoPermitidaError()
  pedido.status = avanco.destino
  if (avanco.destino === STATUS.EM_PRODUCAO) pedido.producaoEm = agora()
  else {
    pedido.concluidoEm = agora()
    pedido.mensagens.push(mensagem(pedido, 'Pronto para retirada'))
  }
  return copia(pedido)
}

// Em produção → Confirmado e Concluído → Em produção (decisão da ZAP-64). A data da etapa
// desfeita sai do histórico; as mensagens já geradas continuam guardadas.
export async function voltarPedido(numero) {
  if (!import.meta.env.DEV) throw new ServicoIndisponivelError()
  await esperar(600)
  const pedido = encontrar(numero)
  const volta = VOLTA[pedido.status]
  if (!volta) throw new AcaoNaoPermitidaError()
  if (pedido.status === STATUS.CONCLUIDO) delete pedido.concluidoEm
  else delete pedido.producaoEm
  pedido.status = volta.destino
  if (pedido.status === STATUS.CONFIRMADO) atualizarConfirmacao(pedido)
  return copia(pedido)
}

// O clique em "Enviar no WhatsApp" marca a mensagem como enviada; reenviar mantém a primeira data (ZAP-64)
export async function marcarMensagemEnviada(numero, indice) {
  if (!import.meta.env.DEV) throw new ServicoIndisponivelError()
  await esperar(200)
  const alvo = encontrar(numero).mensagens[indice]
  if (!alvo) throw new AcaoNaoPermitidaError()
  alvo.status = 'Enviada'
  alvo.enviadoEm ??= agora()
  return copia(encontrar(numero))
}
