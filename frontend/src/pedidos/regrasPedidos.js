// Regras de exibição dos pedidos no quadro (ZAP-28): colunas, valores e datas

// Status do pedido (RN03). Recusado fica fora do quadro até ligar o filtro (RN04).
export const STATUS = { NOVO: 1, CONFIRMADO: 2, EM_PRODUCAO: 3, CONCLUIDO: 4, RECUSADO: 5 }

export const COLUNAS = [
  { status: STATUS.NOVO, nome: 'Novo', cor: '#8a7f77' },
  { status: STATUS.CONFIRMADO, nome: 'Confirmado', cor: '#2f8f4e' },
  { status: STATUS.EM_PRODUCAO, nome: 'Em produção', cor: '#f2b134' },
  { status: STATUS.CONCLUIDO, nome: 'Concluído', cor: '#006d6d' },
  { status: STATUS.RECUSADO, nome: 'Recusado', cor: '#b42318' },
]

export const colunasVisiveis = (mostrarRecusados) =>
  COLUNAS.filter((coluna) => coluna.status !== STATUS.RECUSADO || mostrarRecusados)

// Na mesma coluna, quem retira antes aparece primeiro
export const pedidosDaColuna = (pedidos, status) =>
  pedidos.filter((pedido) => pedido.status === status).sort((a, b) => a.dataRetirada.localeCompare(b.dataRetirada))

// subtotal = quantidade × preço congelado; total = soma dos subtotais (RN10, RN11)
export const subtotal = (item) => Math.round(item.quantidade * item.precoUnitario * 100) / 100
export const totalPedido = (pedido) => pedido.itens.reduce((soma, item) => soma + subtotal(item), 0)

const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
// O Intl usa espaço não separável depois do "R$"; troca por espaço comum para leitura e testes
export const moeda = (valor) => formatoMoeda.format(valor).replace(/ /g, ' ')

// KG aceita fração e UN não (RN12)
export const quantidadeTexto = (item) =>
  item.unidade === 'KG' ? `${item.quantidade.toLocaleString('pt-BR')} kg` : `${item.quantidade} un`

export const nomeItem = (item) => (item.produto === 'Bolo' ? `Bolo de ${item.sabor.toLowerCase()}` : item.sabor)

export const resumoItens = (pedido) => pedido.itens.map((item) => `${nomeItem(item)} · ${quantidadeTexto(item)}`).join(' + ')

// Datas no formato AAAA-MM-DD, comparadas no fuso de quem usa o painel
export const dataLocal = (data) =>
  `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

// "sáb, 14/11", ou "hoje, 07/11" quando a retirada é no dia
export function dataRetiradaCurta(iso, hoje = new Date()) {
  const [ano, mes, dia] = iso.split('-').map(Number)
  const rotulo = iso === dataLocal(hoje) ? 'hoje' : DIAS[new Date(ano, mes - 1, dia).getDay()]
  return `${rotulo}, ${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`
}

const DIAS_POR_EXTENSO = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

// Data das mensagens ao cliente (docs/mensagens-whatsapp.md): "sábado, 14/11" ou "hoje, sábado, 07/11"
export function dataRetiradaMensagem(iso, hoje = new Date()) {
  const [ano, mes, dia] = iso.split('-').map(Number)
  const data = `${DIAS_POR_EXTENSO[new Date(ano, mes - 1, dia).getDay()]}, ${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`
  return iso === dataLocal(hoje) ? `hoje, ${data}` : data
}

// O selo "Retira hoje" só faz sentido para pedido aceito que ainda não ficou pronto
export const retiraHoje = (pedido, hoje = new Date()) =>
  pedido.dataRetirada === dataLocal(hoje) && [STATUS.NOVO, STATUS.CONFIRMADO, STATUS.EM_PRODUCAO].includes(pedido.status)

// Recusar vale para pedidos Novos; cancelar, para Confirmados e Em produção. Os dois levam o pedido
// para Recusado com motivo obrigatório de até 500 caracteres (RN03, RN05, ZAP-64)
export const MOTIVO_MAXIMO = 500
export const podeRecusar = (status) => status === STATUS.NOVO
export const podeCancelar = (status) => status === STATUS.CONFIRMADO || status === STATUS.EM_PRODUCAO
export const podeRecusarOuCancelar = (status) => podeRecusar(status) || podeCancelar(status)

// Edição do pedido (RN21): Concluído e Recusado não mudam; depois de confirmado, o cliente não troca
export const podeEditar = (status) => [STATUS.NOVO, STATUS.CONFIRMADO, STATUS.EM_PRODUCAO].includes(status)
export const podeTrocarCliente = (status) => status === STATUS.NOVO

// Andamento entre as colunas (ZAP-77, RN03): cada etapa tem um só passo à frente e, pela decisão
// da ZAP-64, só Em produção e Concluído podem voltar uma coluna
export const AVANCO = {
  [STATUS.CONFIRMADO]: { destino: STATUS.EM_PRODUCAO, rotulo: 'Iniciar produção' },
  [STATUS.EM_PRODUCAO]: { destino: STATUS.CONCLUIDO, rotulo: 'Marcar como pronto' },
}
export const VOLTA = {
  [STATUS.EM_PRODUCAO]: { destino: STATUS.CONFIRMADO, rotulo: 'Voltar para confirmado' },
  [STATUS.CONCLUIDO]: { destino: STATUS.EM_PRODUCAO, rotulo: 'Voltar para produção' },
}

// Ao voltar de Concluído, o cliente precisa ser avisado se já recebeu o aviso de pronto
export const avisoDeProntoEnviado = (pedido) =>
  pedido.mensagens.some((mensagem) => mensagem.tipo === 'Pronto para retirada' && mensagem.status === 'Enviada')

// Só a mensagem da etapa atual pode ser enviada (ZAP-51): Confirmado → confirmação,
// Concluído → pronto, Recusado → recusa. Novo e Em produção não têm mensagem a enviar.
export const TIPO_MENSAGEM_DA_ETAPA = {
  [STATUS.CONFIRMADO]: 'Confirmação',
  [STATUS.CONCLUIDO]: 'Pronto para retirada',
  [STATUS.RECUSADO]: 'Recusa',
}

// Separa a mensagem da etapa atual (a mais recente do tipo) das anteriores, guardando a
// posição de cada uma na lista do pedido para marcar como enviada
export function mensagensDaEtapa(pedido) {
  const comIndice = pedido.mensagens.map((mensagem, indice) => ({ mensagem, indice }))
  const tipo = TIPO_MENSAGEM_DA_ETAPA[pedido.status]
  const atual = tipo ? comIndice.filter(({ mensagem }) => mensagem.tipo === tipo).at(-1) ?? null : null
  return { atual, anteriores: comIndice.filter((item) => item !== atual) }
}
