// Leitura e gravação dos dados do estabelecimento da usuária logada, pela rota
// /api/estabelecimento (ZAP-36), e do logo e da capa, pelas rotas /api/estabelecimento/logo e
// /api/estabelecimento/capa, que guardam as fotos no Supabase Storage (ZAP-119). Em produção, o
// Render repassa /api ao backend; em desenvolvimento, o proxy do Vite faz o mesmo
// (vite.config.js). A tela continua usando as mesmas funções e erros (ZAP-118, ZAP-120). O token,
// o 401 e a falta de conexão ficam no clienteApi, o mesmo dos produtos.

import {
  chamarApi,
  lerArquivoTemporario,
  lerJson,
  lerToken,
  ServicoIndisponivelError,
  SessaoExpiradaError,
} from '../autenticacao/clienteApi'

export { ServicoIndisponivelError, SessaoExpiradaError } from '../autenticacao/clienteApi'
export class LinkEmUsoError extends Error {}

// 400 do backend: `campos` traz a mensagem de cada campo, com os nomes da tela
export class DadosInvalidosError extends Error {
  constructor(campos) {
    super('Dados inválidos.')
    this.campos = campos ?? {}
  }
}

// Os dados foram salvos, mas uma foto não foi enviada. `salvo` é o estabelecimento como ficou
// no servidor, para a tela mostrar o que já está guardado e deixar tentar a foto de novo.
export class FotoNaoEnviadaError extends Error {
  constructor(mensagem, salvo) {
    super(mensagem)
    this.salvo = salvo
  }
}

// Campos de texto que o backend guarda, com os nomes da tela
const CAMPOS = ['nome', 'slug', 'descricao', 'whatsapp', 'emailContato', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf']

// Fotos da loja, na ordem em que são enviadas; o nome é o da rota e o do campo
const FOTOS = ['logo', 'capa']

// Até a ZAP-120, o logo e a capa ficavam só no navegador (ZAP-118). Agora vêm da API: a cópia
// antiga é apagada, para não ocupar espaço nem ficar para trás em um computador compartilhado.
function apagarFotosAntigasDoNavegador() {
  try {
    Object.keys(localStorage)
      .filter((chave) => chave.startsWith('zappi.fotos-estabelecimento.'))
      .forEach((chave) => localStorage.removeItem(chave))
  } catch {
    // Sem armazenamento: não há cópia para apagar
  }
}
apagarFotosAntigasDoNavegador()

async function chamar(caminho = '', opcoes) {
  const resposta = await chamarApi(`/estabelecimento${caminho}`, opcoes)
  // Link do cardápio já usado por outro estabelecimento
  if (resposta.status === 409) throw new LinkEmUsoError()
  if (resposta.status === 400) throw new DadosInvalidosError((await lerJson(resposta))?.campos)
  if (!resposta.ok) throw new ServicoIndisponivelError()
  return resposta.json()
}

// O backend manda nulo nos campos vazios; a tela trabalha com texto vazio. `logo` e `capa` são
// os endereços públicos das fotos no Storage.
function paraTela(estabelecimento) {
  return Object.fromEntries([...CAMPOS, ...FOTOS].map((campo) => [campo, estabelecimento?.[campo] ?? '']))
}

// A foto escolhida na tela é um endereço temporário (blob:); o arquivo vai para o backend, que
// confere o tipo e o tamanho e envia para o Storage (ZAP-119)
async function enviarFoto(foto, enderecoTemporario) {
  const formulario = new FormData()
  formulario.append('arquivo', await lerArquivoTemporario(enderecoTemporario), foto)
  return chamar(`/${foto}`, { metodo: 'POST', formulario })
}

const MENSAGEM_FOTO = {
  logo: 'Os dados foram salvos, mas o logo não foi enviado.',
  capa: 'Os dados foram salvos, mas a foto de capa não foi enviada.',
}

// Explica o que houve com a foto, em linguagem simples; a sessão vencida segue para o login
function erroDaFoto(foto, erro, salvo) {
  if (erro instanceof SessaoExpiradaError) return erro
  const motivo = erro instanceof DadosInvalidosError && erro.campos.arquivo
    ? erro.campos.arquivo
    : 'Tente de novo em alguns minutos.'
  return new FotoNaoEnviadaError(`${MENSAGEM_FOTO[foto]} ${motivo}`, salvo)
}

// Quem mostra a marca da loja (topo do painel) é avisado quando o Meu estabelecimento é
// salvo, para o nome e o logo mudarem na hora em todas as telas.
const ouvintes = new Set()
export function ouvirEstabelecimento(aoMudar) {
  ouvintes.add(aoMudar)
  return () => ouvintes.delete(aoMudar)
}

const avisar = (estabelecimento) => ouvintes.forEach((aoMudar) => aoMudar({ nome: estabelecimento.nome, logo: estabelecimento.logo }))

// Nome e logo da loja, os mesmos do Meu estabelecimento. Sem login não há token, e a API não
// sabe qual é a loja: devolve nulo e a tela mostra só a marca do Zappi.
// PENDENTE: a collab no login depende de uma rota pública da loja, a combinar com o front.
export async function buscarMarcaLoja() {
  if (!lerToken()) return null
  const estabelecimento = await buscarEstabelecimento()
  return { nome: estabelecimento.nome, logo: estabelecimento.logo }
}

export async function buscarEstabelecimento() {
  return paraTela(await chamar())
}

// Salva os dados e depois envia as fotos novas (blob:) ou tira as que a tela apagou. Os dados
// vão primeiro: se uma foto falhar, eles já estão guardados (FotoNaoEnviadaError).
export async function salvarEstabelecimento(dados) {
  const corpo = Object.fromEntries(CAMPOS.map((campo) => [campo, dados[campo] ?? '']))
  let salvo = paraTela(await chamar('', { metodo: 'PUT', json: corpo }))

  for (const foto of FOTOS) {
    const escolhida = String(dados[foto] ?? '')
    try {
      if (escolhida.startsWith('blob:')) salvo = paraTela(await enviarFoto(foto, escolhida))
      else if (!escolhida && salvo[foto]) salvo = paraTela(await chamar(`/${foto}`, { metodo: 'DELETE' }))
    } catch (erro) {
      avisar(salvo)
      throw erroDaFoto(foto, erro, salvo)
    }
  }

  avisar(salvo)
  return salvo
}
