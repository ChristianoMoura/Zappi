// Leitura do cardápio público pelo link da loja, sem login: GET /api/cardapio/{slug} (ZAP-104).
// Devolve só dados públicos: nome, descrição, WhatsApp, logo e capa da loja e os produtos ativos
// (RN14). Nada de endereço, e-mail ou dados de clientes (LGPD).
//
// PENDENTE (ZAP-104): enquanto a rota não existir no backend, o modo de desenvolvimento mostra
// um cardápio simulado (cardapioSimulado.js). Em produção, nunca há simulação.

import { ordenarFormas } from '../comum/formasPagamento'
import { ordenarAlergenos } from '../produtos/regrasProdutos'

export class CardapioNaoEncontradoError extends Error {}
export class ServicoIndisponivelError extends Error {}

// Erro do backend quando o link não leva a nenhum estabelecimento (TratadorDeErros)
const CODIGO_NAO_ENCONTRADO = 'ESTABELECIMENTO_NAO_ENCONTRADO'

async function lerJson(resposta) {
  try {
    return await resposta.json()
  } catch {
    return null
  }
}

// PENDENTE (ZAP-138): até o backend mandar as categorias, o cardápio chega no formato antigo, com
// o tipo em `nome` (Bolo, Salgado) e o nome do produto em `sabor`. Aqui ele vira o formato novo,
// com o tipo como categoria, na ordem em que aparece. Sai quando a ZAP-138 entrar.
function doFormatoAntigo(produtos) {
  const categorias = []
  const convertidos = produtos.map((p) => {
    const nome = p.nome ?? ''
    let categoria = categorias.find((c) => c.nome === nome)
    if (!categoria) {
      categoria = { id: `antiga-${categorias.length + 1}`, nome }
      categorias.push(categoria)
    }
    return { ...p, nome: p.sabor || nome, categoria }
  })
  return { categorias, produtos: convertidos }
}

// O backend manda nulo nos campos vazios; a tela trabalha com texto vazio. Cada produto leva o id e
// o nome da categoria; as categorias vêm na ordem da loja, só as que têm produto (ZAP-140)
function paraTela(resposta) {
  const formatoAntigo = !resposta.categorias && (resposta.produtos ?? []).some((p) => 'sabor' in p)
  const { estabelecimento } = resposta
  const { categorias, produtos } = formatoAntigo ? doFormatoAntigo(resposta.produtos) : resposta
  return {
    categorias: (categorias ?? []).map((c) => ({ id: c.id, nome: c.nome ?? '' })),
    estabelecimento: {
      nome: estabelecimento?.nome ?? '',
      slug: estabelecimento?.slug ?? '',
      descricao: estabelecimento?.descricao ?? '',
      whatsapp: estabelecimento?.whatsapp ?? '',
      logo: estabelecimento?.logo ?? '',
      capa: estabelecimento?.capa ?? '',
      // Seção "Promoções" no topo do cardápio, ligada por padrão (ZAP-160, ZAP-162)
      destacarPromocoes: estabelecimento?.destacarPromocoes !== false,
      // Formas de pagamento aceitas (ZAP-192, ZAP-194); nulo sem o campo na API
      formasPagamento: Array.isArray(estabelecimento?.formasPagamento) ? ordenarFormas(estabelecimento.formasPagamento) : null,
    },
    produtos: (produtos ?? []).map((p) => ({
      id: p.id,
      nome: p.nome ?? '',
      categoriaId: p.categoria?.id ?? null,
      categoria: p.categoria?.nome ?? '',
      unidade: p.unidade,
      preco: Number(p.preco),
      descricao: p.descricao ?? '',
      foto: p.foto ?? '',
      textoAlternativo: p.textoAlternativo ?? '',
      alergenos: ordenarAlergenos(p.alergenos),
      outrosAlergenos: p.outrosAlergenos ?? '',
      // Preço com desconto, nulo sem promoção (ZAP-152, ZAP-162)
      precoPromocional: p.precoPromocional == null ? null : Number(p.precoPromocional),
    })),
  }
}

async function simulado(slug) {
  const { cardapioSimulado } = await import('./cardapioSimulado')
  return paraTela(await cardapioSimulado(slug))
}

// Em desenvolvimento, sem a rota pública (o backend responde 401 por exigir login, 404 sem o
// código do erro, ou nem está rodando), usa o cardápio simulado
const semRotaPublica = (status, corpo) => status === 401 || (status === 404 && corpo?.codigo !== CODIGO_NAO_ENCONTRADO) || status >= 500

export async function buscarCardapio(slug) {
  let resposta
  try {
    resposta = await fetch(`/api/cardapio/${encodeURIComponent(slug)}`)
  } catch {
    if (import.meta.env.DEV) return simulado(slug)
    // Sem conexão ou servidor fora do ar
    throw new ServicoIndisponivelError()
  }

  if (resposta.ok) return paraTela(await resposta.json())

  const corpo = await lerJson(resposta)
  if (import.meta.env.DEV && semRotaPublica(resposta.status, corpo)) return simulado(slug)
  if (resposta.status === 404) throw new CardapioNaoEncontradoError()
  throw new ServicoIndisponivelError()
}

// ---------- Envio do pedido pelo cliente (ZAP-110) ----------

// O backend recusou os dados (400): `campos` traz a mensagem de cada campo, para a tela mostrar
// junto dele (ex.: { "cliente.telefone": "..." })
export class PedidoRecusadoError extends Error {
  constructor(mensagem, campos) {
    super(mensagem || 'Confira os dados do pedido.')
    this.campos = campos ?? {}
  }
}

// Limite de envios atingido (429, ZAP-112): a tela mostra a mensagem do backend
export class EnviosDemaisError extends Error {}

// POST /api/cardapio/{slug}/pedidos (ZAP-109), sem login. Responde 201 com o número do pedido. Se
// o campo invisível veio preenchido, o backend responde igual, mas sem número (robô, ZAP-103).
export async function enviarPedido(slug, corpo) {
  let resposta
  try {
    resposta = await fetch(`/api/cardapio/${encodeURIComponent(slug)}/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    })
  } catch {
    throw new ServicoIndisponivelError()
  }
  if (resposta.ok) return (await lerJson(resposta))?.numero ?? null
  const erro = await lerJson(resposta)
  if (resposta.status === 400) throw new PedidoRecusadoError(erro?.mensagem, erro?.campos)
  if (resposta.status === 429) throw new EnviosDemaisError(erro?.mensagem || 'Você já enviou muitos pedidos. Tente mais tarde ou fale com a loja pelo WhatsApp.')
  if (resposta.status === 404) throw new CardapioNaoEncontradoError()
  throw new ServicoIndisponivelError()
}
