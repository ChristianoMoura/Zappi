// Regras da montagem do pedido pelo cliente no cardápio público (ZAP-101 / ZAP-107).
// O valor na tela é só informativo: quem calcula o valor gravado é o backend (RN11).
import { mascaraTelefone, soDigitos } from '../estabelecimento/regrasEstabelecimento'
import { LIMITES } from '../pedidos/regrasCadastroPedido'
import { precoVigente } from '../produtos/regrasProdutos'

export { LIMITES }

// KG aceita fração (de 0,5 em 0,5 kg) e UN só inteiros (RN12)
export const passo = (produto) => (produto.unidade === 'KG' ? 0.5 : 1)
const arredondar = (valor) => Math.round(valor * 100) / 100

export function mudarQuantidade(produto, quantidade, sinal) {
  return Math.max(passo(produto), arredondar(quantidade + sinal * passo(produto)))
}

const formatoNumero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
export function quantidadeTexto(produto, quantidade) {
  if (produto.unidade === 'KG') return `${formatoNumero.format(quantidade)} kg`
  return `${quantidade} ${quantidade === 1 ? 'unidade' : 'unidades'}`
}

// Com promoção, o preço com desconto (ZAP-162). A estimativa da tela; quem grava é o backend (RN10)
export const subtotal = (produto, quantidade) => arredondar(precoVigente(produto) * quantidade)

// Itens do pedido com o produto do cardápio. Os de produtos que saíram do cardápio (RN14, ZAP-151)
// não entram no total nem na mensagem enviada à loja
export function itensComProduto(itens, produtos) {
  return itens.map((item) => ({ ...item, produto: produtos.find((p) => p.id === item.produtoId) })).filter((item) => item.produto)
}

// Todos os itens, na ordem do pedido, marcando os indisponíveis (ZAP-156): eles continuam na tela,
// com o nome e a foto guardados ao adicionar, até o cliente remover. Se o produto voltar ao
// cardápio, o item volta ao normal.
export function itensDoPedido(itens, produtos) {
  return itens.map((item) => {
    const produto = produtos.find((p) => p.id === item.produtoId)
    return produto ? { ...item, produto, disponivel: true } : { ...item, produto: null, disponivel: false }
  })
}

// "2 itens" ou "2 itens · 1 indisponível"
export function contagemDosItens(disponiveis, indisponiveis) {
  const texto = `${disponiveis} ${disponiveis === 1 ? 'item' : 'itens'}`
  return indisponiveis ? `${texto} · ${indisponiveis} ${indisponiveis === 1 ? 'indisponível' : 'indisponíveis'}` : texto
}

export const totalDoPedido = (itens, produtos) =>
  arredondar(itensComProduto(itens, produtos).reduce((soma, item) => soma + subtotal(item.produto, item.quantidade), 0))

// ---------- Data e hora de retirada (ZAP-87: a retirada tem data e hora) ----------

const FUSO = 'America/Sao_Paulo'

// Hoje no horário de São Paulo, sem depender do fuso do aparelho: "2026-11-10"
export const hojeEmSaoPaulo = (agora = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(agora)

export function somarDias(iso, dias) {
  const data = new Date(`${iso}T12:00:00Z`)
  data.setUTCDate(data.getUTCDate() + dias)
  return data.toISOString().slice(0, 10)
}

// Pelo portal, a data precisa de pelo menos 7 dias corridos de antecedência (RN22)
export const ANTECEDENCIA_DIAS = 7
export const dataMinima = (agora = new Date()) => somarDias(hojeEmSaoPaulo(agora), ANTECEDENCIA_DIAS)

// Proposta da ZAP-87, a confirmar com a Lídia: de 30 em 30 minutos, das 8h às 20h
export const HORARIOS = Array.from({ length: 25 }, (_, i) => {
  const minutos = 8 * 60 + i * 30
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`
})

// "15:00" vira "15h" e "15:30" vira "15h30", como nas mensagens do WhatsApp
export function horaTexto(hora) {
  const [h, m] = hora.split(':')
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`
}

export const dataCurta = (iso) => iso.split('-').reverse().join('/')

const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
export function dataPorExtenso(iso) {
  const dia = new Date(`${iso}T12:00:00Z`).getUTCDay()
  return `${DIAS[dia]}, ${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}

// Data e hora no formato da API (ZAP-124): ISO 8601 com o fuso de São Paulo, que não tem horário de verão
export const dataRetiradaISO = (data, hora) => `${data}T${hora}:00-03:00`

// ---------- Identificação do cliente (ZAP-110) ----------

// Nome e WhatsApp ficam só na tela, sem ir para o pedido guardado no navegador (LGPD)
export const CLIENTE_VAZIO = { nome: '', whatsapp: '', aceite: false, site: '' }
export const LIMITE_NOME = 100

// O WhatsApp aparece como "(11) 90000-0000" enquanto o cliente digita
export const mascaraWhatsapp = (digitado) => mascaraTelefone(soDigitos(digitado).slice(0, 11))

export function validarCliente(cliente) {
  const erros = {}
  if (!cliente.nome.trim()) erros.nome = 'Escreva seu nome.'
  else if (cliente.nome.trim().length > LIMITE_NOME) erros.nome = `Use no máximo ${LIMITE_NOME} caracteres.`
  const digitos = soDigitos(cliente.whatsapp)
  if (!digitos) erros.whatsapp = 'Escreva seu WhatsApp com DDD.'
  else if (digitos.length !== 11) erros.whatsapp = 'O WhatsApp precisa ter DDD e 9 números. Ex.: (11) 90000-0000'
  if (!cliente.aceite) erros.aceite = 'Marque a caixa para enviar o pedido.'
  return erros
}

// Corpo do POST /api/cardapio/{slug}/pedidos (ZAP-109). Vão só os itens que estão no cardápio
// (ZAP-156). O preço não vai: quem decide é o backend, com o desconto vigente (RN10).
export function montarEnvio(pedido, produtos, cliente, versaoTermos = null, formaPagamento = '') {
  return {
    // Forma de pagamento escolhida (ZAP-194), só quando a loja tem as formas cadastradas
    ...(formaPagamento ? { formaPagamento } : {}),
    cliente: { nome: cliente.nome.trim(), telefone: `55${soDigitos(cliente.whatsapp)}` },
    consentimentoLgpd: cliente.aceite,
    ...(versaoTermos ? { versaoTermos } : {}),
    dataRetirada: dataRetiradaISO(pedido.data, pedido.hora),
    observacao: pedido.observacao.trim(),
    itens: itensComProduto(pedido.itens, produtos).map(({ produtoId, quantidade, observacao }) => ({
      produtoId,
      quantidade,
      observacao: (observacao ?? '').trim(),
    })),
    site: cliente.site,
  }
}

// ---------- Validação ----------

// Devolve { campo: mensagem }, na ordem da tela, para levar o foco ao primeiro erro (NBR 17225 5.3.3)
export function validarPedido(pedido, produtos, agora = new Date()) {
  const erros = {}
  if (itensComProduto(pedido.itens, produtos).length === 0) erros.itens = 'Adicione pelo menos um produto ao pedido.'
  const minima = dataMinima(agora)
  if (!pedido.data) erros.data = 'Escolha a data de retirada.'
  else if (pedido.data < minima) erros.data = `Escolha uma data a partir de ${dataCurta(minima)}. A loja precisa de pelo menos ${ANTECEDENCIA_DIAS} dias para preparar a encomenda.`
  if (!pedido.hora) erros.hora = 'Escolha a hora de retirada.'
  else if (!HORARIOS.includes(pedido.hora)) erros.hora = 'Escolha um horário da lista.'
  if (pedido.observacao.length > LIMITES.observacao) erros.observacao = `Use no máximo ${LIMITES.observacao} caracteres.`
  return erros
}

