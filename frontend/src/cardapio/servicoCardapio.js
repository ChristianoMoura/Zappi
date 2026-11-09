// Leitura do cardápio público pelo link da loja, sem login: GET /api/cardapio/{slug} (ZAP-104).
// Devolve só dados públicos: nome, descrição, WhatsApp, logo e capa da loja e os produtos ativos
// (RN14). Nada de endereço, e-mail ou dados de clientes (LGPD).
//
// PENDENTE (ZAP-104): enquanto a rota não existir no backend, o modo de desenvolvimento mostra
// um cardápio simulado (cardapioSimulado.js). Em produção, nunca há simulação.

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

// O backend manda nulo nos campos vazios; a tela trabalha com texto vazio
function paraTela({ estabelecimento, produtos }) {
  return {
    estabelecimento: {
      nome: estabelecimento?.nome ?? '',
      slug: estabelecimento?.slug ?? '',
      descricao: estabelecimento?.descricao ?? '',
      whatsapp: estabelecimento?.whatsapp ?? '',
      logo: estabelecimento?.logo ?? '',
      capa: estabelecimento?.capa ?? '',
    },
    produtos: (produtos ?? []).map((p) => ({
      id: p.id,
      nome: p.nome ?? '',
      sabor: p.sabor ?? '',
      unidade: p.unidade,
      preco: Number(p.preco),
      descricao: p.descricao ?? '',
      foto: p.foto ?? '',
      textoAlternativo: p.textoAlternativo ?? '',
    })),
  }
}

async function simulado(slug) {
  const { cardapioSimulado } = await import('./cardapioSimulado')
  return cardapioSimulado(slug)
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
