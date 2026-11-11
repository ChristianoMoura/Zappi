// Regras da montagem do pedido pelo cliente no cardápio público (ZAP-101 / ZAP-107).
// O valor na tela é só informativo: quem calcula o valor gravado é o backend (RN11).
import { moeda } from '../pedidos/regrasPedidos'
import { LIMITES } from '../pedidos/regrasCadastroPedido'

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

export const subtotal = (produto, quantidade) => arredondar(produto.preco * quantidade)

// Itens do pedido com o produto do cardápio; itens de produtos que saíram do cardápio somem (RN14)
export function itensComProduto(itens, produtos) {
  return itens.map((item) => ({ ...item, produto: produtos.find((p) => p.id === item.produtoId) })).filter((item) => item.produto)
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

// ---------- Mensagem do WhatsApp ----------

// Enquanto o envio pelo Zappi não existe (ZAP-109 e ZAP-110), o pedido segue pelo WhatsApp da loja
export function mensagemDoPedido(loja, pedido, produtos) {
  const linhas = [`Olá! Montei um pedido no cardápio da ${loja.nome} no Zappi:`, '']
  for (const { produto, quantidade, recheio, cobertura, observacao } of itensComProduto(pedido.itens, produtos)) {
    linhas.push(`• ${produto.sabor} — ${quantidadeTexto(produto, quantidade)} (${moeda(subtotal(produto, quantidade))})`)
    if (recheio) linhas.push(`  Recheio: ${recheio}`)
    if (cobertura) linhas.push(`  Cobertura: ${cobertura}`)
    if (observacao) linhas.push(`  Observação: ${observacao}`)
  }
  linhas.push('', `Retirada: ${dataPorExtenso(pedido.data)}, às ${horaTexto(pedido.hora)}`)
  if (pedido.observacao.trim()) linhas.push(`Observação do pedido: ${pedido.observacao.trim()}`)
  linhas.push(`Total estimado: ${moeda(totalDoPedido(pedido.itens, produtos))}`)
  return linhas.join('\n')
}
