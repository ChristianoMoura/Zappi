// Regras do cadastro e da edição de pedido pela Lídia (ZAP-89, ZAP-91, US7, RF13, RF14, tabelas `pedido`, `item_pedido` e
// `cliente` do context.md). O backend (ZAP-88) valida de novo; aqui as regras servem para avisar
// a Lídia antes de salvar.

import { soDigitos } from '../estabelecimento/regrasEstabelecimento'
import { dataLocal, HORARIOS_RETIRADA, partesDaRetirada, subtotal } from './regrasPedidos'

// Agora no formato da retirada, AAAA-MM-DDTHH:MM, no fuso de quem usa o painel
const horaLocal = (data) =>
  `${dataLocal(data)}T${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`

export const LIMITES = { clienteNome: 100, observacao: 500, recheio: 100, cobertura: 100, observacaoItem: 300 }

let proximaChave = 0
export const itemVazio = () => ({ chave: ++proximaChave, produtoId: '', quantidade: '', recheio: '', cobertura: '', observacao: '' })

// Lê a quantidade como a Lídia digita: "2", "1,5" ou "1.5". Null se vazia, NaN se não for número.
export function lerQuantidade(texto) {
  const limpo = String(texto ?? '').trim().replace(',', '.')
  if (!limpo) return null
  if (!/^\d+(\.\d+)?$/.test(limpo)) return NaN
  return Number(limpo)
}

// Valor do campo Produto para um item que já estava no pedido: ele mantém o preço da época (RN10)
export const CONGELADO = 'congelado'

// Produto do item: o congelado no pedido ou o escolhido agora do cardápio, com o preço atual
export function produtoDoItem(item, produtos) {
  if (item.produtoId === CONGELADO) {
    const { produtoId, produto, sabor, unidade, precoUnitario } = item.congelado
    return { id: produtoId, nome: produto, sabor, unidade, preco: precoUnitario }
  }
  return produtos.find((p) => String(p.id) === String(item.produtoId))
}

// Preenche o formulário de edição com o pedido salvo (ZAP-91)
export function formularioDoPedido(pedido) {
  return {
    clienteNome: pedido.cliente.nome,
    clienteWhatsapp: soDigitos(pedido.cliente.telefone).replace(/^55/, ''),
    consentimentoLgpd: true,
    dataRetirada: partesDaRetirada(pedido.dataRetirada).data,
    horaRetirada: partesDaRetirada(pedido.dataRetirada).hora,
    observacao: pedido.observacao ?? '',
    itens: pedido.itens.map((item) => ({
      chave: ++proximaChave,
      produtoId: CONGELADO,
      congelado: item,
      quantidade: String(item.quantidade).replace('.', ','),
      recheio: item.recheio ?? '',
      cobertura: item.cobertura ?? '',
      observacao: item.observacao ?? '',
    })),
  }
}

// Item do formulário com o produto escolhido: subtotal = quantidade × preço (RN11)
export function subtotalDoItem(item, produtos) {
  const produto = produtoDoItem(item, produtos)
  const quantidade = lerQuantidade(item.quantidade)
  if (!produto || !(quantidade > 0)) return 0
  return subtotal({ quantidade, precoUnitario: produto.preco })
}

export const totalDoFormulario = (itens, produtos) => itens.reduce((soma, item) => soma + subtotalDoItem(item, produtos), 0)

// Devolve { campo: mensagem }. Campos dos itens: `item-<chave>-produto` e `item-<chave>-quantidade`.
// Na edição, `dataOriginal` permite manter uma data que já passou, se ela não foi mudada.
export function validarPedido(dados, produtos, hoje = new Date(), dataOriginal = null) {
  const erros = {}

  if (!dados.clienteNome.trim()) erros.clienteNome = 'Escreva o nome do cliente.'
  else if (dados.clienteNome.length > LIMITES.clienteNome) erros.clienteNome = `Use no máximo ${LIMITES.clienteNome} caracteres.`

  const whatsapp = soDigitos(dados.clienteWhatsapp)
  if (!whatsapp) erros.clienteWhatsapp = 'Escreva o WhatsApp do cliente com DDD.'
  else if (whatsapp.length !== 11) erros.clienteWhatsapp = 'O WhatsApp precisa ter DDD e 9 números. Ex.: (11) 90000-0000'

  // RN16: o cliente só é gravado com o consentimento registrado (LGPD)
  if (!dados.consentimentoLgpd) erros.consentimentoLgpd = 'Confirme que o cliente autorizou o uso do nome e do WhatsApp.'

  for (const item of dados.itens) {
    const produto = produtoDoItem(item, produtos)
    if (!produto) {
      erros[`item-${item.chave}-produto`] = 'Escolha o produto.'
      continue
    }
    const quantidade = lerQuantidade(item.quantidade)
    const chave = `item-${item.chave}-quantidade`
    if (quantidade === null) erros[chave] = produto.unidade === 'KG' ? 'Escreva a quantidade em kg. Ex.: 1,5' : 'Escreva quantas unidades. Ex.: 50'
    else if (Number.isNaN(quantidade) || quantidade <= 0) erros[chave] = 'A quantidade precisa ser um número maior que zero.'
    // RN12: KG aceita fração (até 3 casas); UN só números inteiros
    else if (produto.unidade === 'UN' && !Number.isInteger(quantidade)) erros[chave] = 'Este produto é vendido por unidade: use um número inteiro.'
    else if (produto.unidade === 'KG' && Math.round(quantidade * 1000) !== quantidade * 1000) erros[chave] = 'Use no máximo 3 casas depois da vírgula. Ex.: 1,5'
    else if (quantidade >= 100000) erros[chave] = 'Confira a quantidade: ela está alta demais.'
  }

  // RN23: retirada das 8h às 20h, de 30 em 30 minutos. A data e hora que já estava no pedido
  // pode ficar, mesmo que tenha passado, se não foi mudada (ZAP-127)
  const retirada = `${dados.dataRetirada}T${dados.horaRetirada}`
  const mudou = retirada !== dataOriginal
  if (!dados.dataRetirada) erros.dataRetirada = 'Escolha a data de retirada.'
  else if (mudou && dados.dataRetirada < dataLocal(hoje)) erros.dataRetirada = 'A data de retirada já passou. Escolha hoje ou um dia depois.'
  if (!dados.horaRetirada) erros.horaRetirada = 'Escolha o horário de retirada.'
  else if (mudou && !HORARIOS_RETIRADA.includes(dados.horaRetirada)) erros.horaRetirada = 'Escolha um horário entre 8h e 20h, de 30 em 30 minutos.'
  else if (mudou && !erros.dataRetirada && dados.dataRetirada && retirada < horaLocal(hoje)) erros.horaRetirada = 'Esse horário já passou. Escolha um horário a partir de agora.'

  if (dados.observacao.length > LIMITES.observacao) erros.observacao = `Use no máximo ${LIMITES.observacao} caracteres.`
  return erros
}

// Ordem dos campos na tela para levar o foco ao primeiro erro (NBR 17225 5.1.4):
// cliente → itens → data e horário de retirada → observações
export function ordemDosCampos(itens) {
  return [
    'clienteNome',
    'clienteWhatsapp',
    'consentimentoLgpd',
    ...itens.flatMap((item) => [`item-${item.chave}-produto`, `item-${item.chave}-quantidade`]),
    'dataRetirada',
    'horaRetirada',
    'observacao',
  ]
}

// Converte o formulário no pedido que vai para o serviço, com o preço congelado (RN10): o da
// época nos itens que já estavam no pedido e o atual do cardápio nos itens novos
export function montarPedido(dados, produtos) {
  return {
    cliente: { nome: dados.clienteNome.trim(), telefone: `55${soDigitos(dados.clienteWhatsapp)}` },
    consentimentoLgpd: dados.consentimentoLgpd,
    dataRetirada: `${dados.dataRetirada}T${dados.horaRetirada}`,
    observacao: dados.observacao.trim(),
    itens: dados.itens.map((item) => {
      const produto = produtoDoItem(item, produtos)
      return {
        produtoId: produto.id,
        produto: produto.nome,
        sabor: produto.sabor,
        unidade: produto.unidade,
        quantidade: lerQuantidade(item.quantidade),
        precoUnitario: produto.preco,
        ...(item.recheio.trim() ? { recheio: item.recheio.trim() } : {}),
        ...(item.cobertura.trim() ? { cobertura: item.cobertura.trim() } : {}),
        ...(item.observacao.trim() ? { observacao: item.observacao.trim() } : {}),
      }
    }),
  }
}
