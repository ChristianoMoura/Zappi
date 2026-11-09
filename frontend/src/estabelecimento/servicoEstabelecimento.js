// Leitura e gravação dos dados do estabelecimento da usuária logada, pela rota
// /api/estabelecimento (ZAP-36). Em produção, o Render repassa /api ao backend; em
// desenvolvimento, o proxy do Vite faz o mesmo (vite.config.js). A tela continua usando as
// mesmas funções e erros de antes (ZAP-118).
//
// PENDENTE (ZAP-119 e ZAP-120): o DER ainda não tem logo nem capa. Até lá, as duas fotos ficam
// guardadas só neste navegador (localStorage), separadas pelo link do cardápio da loja.

export class ServicoIndisponivelError extends Error {}
export class LinkEmUsoError extends Error {}
export class SessaoExpiradaError extends Error {}

// 400 do backend: `campos` traz a mensagem de cada campo, com os nomes da tela
export class DadosInvalidosError extends Error {
  constructor(campos) {
    super('Dados inválidos.')
    this.campos = campos ?? {}
  }
}

// Campos que o backend guarda, com os nomes da tela; logo e capa ficam de fora
const CAMPOS = ['nome', 'slug', 'descricao', 'whatsapp', 'emailContato', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf']

// A mesma chave do AutenticacaoContexto, onde fica o token do login (ZAP-62)
const CHAVE_SESSAO = 'zappi.sessao'

function lerToken() {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE_SESSAO))?.token ?? null
  } catch {
    return null
  }
}

// Token vencido ou inválido: encerra a sessão e volta para o login, como o useApi faz
function encerrarSessao() {
  try {
    sessionStorage.removeItem(CHAVE_SESSAO)
  } catch {
    // Sem armazenamento: não há sessão guardada para apagar
  }
  window.location.assign('/login')
}

async function lerJson(resposta) {
  try {
    return await resposta.json()
  } catch {
    return null
  }
}

async function chamar({ metodo = 'GET', json } = {}) {
  const headers = {}
  const token = lerToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (json !== undefined) headers['Content-Type'] = 'application/json'

  let resposta
  try {
    resposta = await fetch('/api/estabelecimento', { method: metodo, headers, body: json === undefined ? undefined : JSON.stringify(json) })
  } catch {
    // Sem conexão ou servidor fora do ar
    throw new ServicoIndisponivelError()
  }
  if (resposta.status === 401) {
    encerrarSessao()
    throw new SessaoExpiradaError()
  }
  // Link do cardápio já usado por outro estabelecimento
  if (resposta.status === 409) throw new LinkEmUsoError()
  if (resposta.status === 400) throw new DadosInvalidosError((await lerJson(resposta))?.campos)
  if (!resposta.ok) throw new ServicoIndisponivelError()
  return resposta.json()
}

// O backend manda nulo nos campos vazios; a tela trabalha com texto vazio
function paraTela(estabelecimento) {
  return Object.fromEntries(CAMPOS.map((campo) => [campo, estabelecimento?.[campo] ?? '']))
}

// --- Logo e capa, guardados só neste navegador até a ZAP-119 e a ZAP-120 ---

const SEM_FOTOS = { logo: '', capa: '' }
const chaveFotos = (slug) => `zappi.fotos-estabelecimento.${slug}`

// Só imagens embutidas (data:) são guardadas: um endereço temporário (blob:) some ao recarregar
const fotoValida = (foto) => typeof foto === 'string' && (foto === '' || foto.startsWith('data:'))

function lerFotos(slug) {
  try {
    const guardado = JSON.parse(localStorage.getItem(chaveFotos(slug)) || 'null')
    if (!guardado || typeof guardado !== 'object') return { ...SEM_FOTOS }
    return {
      logo: fotoValida(guardado.logo) ? guardado.logo : '',
      capa: fotoValida(guardado.capa) ? guardado.capa : '',
    }
  } catch {
    return { ...SEM_FOTOS }
  }
}

function guardarFotos(slug, fotos, slugAnterior) {
  try {
    if (slugAnterior && slugAnterior !== slug) localStorage.removeItem(chaveFotos(slugAnterior))
    localStorage.setItem(chaveFotos(slug), JSON.stringify({ logo: fotos.logo || '', capa: fotos.capa || '' }))
  } catch {
    // Sem espaço ou sem armazenamento: as fotos continuam valendo até recarregar a página
  }
}

// A foto escolhida na tela é um endereço temporário (blob:), que some ao recarregar. Para
// guardar, ela vira uma imagem embutida, reduzida para caber no espaço do navegador
// (logo com até 320 px e capa com até 1600 px de largura).
async function fotoParaGuardar(url, larguraMaxima) {
  if (!url || !String(url).startsWith('blob:')) return url || ''
  try {
    const imagem = await new Promise((resolver, rejeitar) => {
      const img = new Image()
      img.onload = () => resolver(img)
      img.onerror = rejeitar
      img.src = url
    })
    const escala = Math.min(1, larguraMaxima / imagem.naturalWidth)
    const tela = document.createElement('canvas')
    tela.width = Math.round(imagem.naturalWidth * escala)
    tela.height = Math.round(imagem.naturalHeight * escala)
    tela.getContext('2d').drawImage(imagem, 0, 0, tela.width, tela.height)
    return tela.toDataURL('image/webp', 0.85)
  } catch {
    return url
  }
}

// Link do cardápio lido por último, para mudar as fotos de lugar quando a Lídia trocar o link
let slugAtual = null

// Quem mostra a marca da loja (topo do painel) é avisado quando o Meu estabelecimento é
// salvo, para o nome e o logo mudarem na hora em todas as telas.
const ouvintes = new Set()
export function ouvirEstabelecimento(aoMudar) {
  ouvintes.add(aoMudar)
  return () => ouvintes.delete(aoMudar)
}

// Nome e logo da loja, os mesmos do Meu estabelecimento. Sem login não há token, e a API não
// sabe qual é a loja: devolve nulo e a tela mostra só a marca do Zappi.
// PENDENTE: a collab no login depende de uma rota pública da loja, a combinar com o front.
export async function buscarMarcaLoja() {
  if (!lerToken()) return null
  const estabelecimento = await buscarEstabelecimento()
  return { nome: estabelecimento.nome, logo: estabelecimento.logo }
}

export async function buscarEstabelecimento() {
  const dados = paraTela(await chamar())
  slugAtual = dados.slug
  return { ...dados, ...lerFotos(dados.slug) }
}

export async function salvarEstabelecimento(dados) {
  const corpo = Object.fromEntries(CAMPOS.map((campo) => [campo, dados[campo] ?? '']))
  const salvo = paraTela(await chamar({ metodo: 'PUT', json: corpo }))

  const fotos = { logo: await fotoParaGuardar(dados.logo, 320), capa: await fotoParaGuardar(dados.capa, 1600) }
  guardarFotos(salvo.slug, fotos, slugAtual)
  slugAtual = salvo.slug

  const resposta = { ...salvo, ...fotos }
  ouvintes.forEach((aoMudar) => aoMudar({ nome: resposta.nome, logo: resposta.logo }))
  return resposta
}
