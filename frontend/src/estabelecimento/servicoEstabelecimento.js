// Leitura e gravação dos dados do estabelecimento da usuária logada.
// PENDENTE: a API é a ZAP-36, que ainda não existe. Enquanto isso, no modo de
// desenvolvimento os dados são simulados com a Casa Belt do seed (dados fictícios) e as
// alterações ficam guardadas no navegador (localStorage), para o Meu estabelecimento, o topo
// do painel e o login mostrarem o mesmo nome e logo mesmo depois de recarregar a página.
// Fora do modo de desenvolvimento, a tela avisa que o serviço não está disponível.
// Quando a ZAP-36 ficar pronta, só este arquivo muda (e a cópia no navegador deixa de existir).

import logoCasaBelt from '../assets/logo-casa-belt.webp'

export class ServicoIndisponivelError extends Error {}
export class LinkEmUsoError extends Error {}

// Campos com os nomes da tela; a ZAP-36 converte para as colunas da tabela `estabelecimento`
const DADOS_INICIAIS = {
  nome: 'Casa Belt',
  descricao: 'Bolos e salgados artesanais sob encomenda.',
  slug: 'casa-belt',
  whatsapp: '5511900000000',
  emailContato: 'contato@casabelt.com',
  cep: '01000000',
  logradouro: 'Rua das Flores',
  numero: '123',
  complemento: '',
  bairro: 'Centro',
  cidade: 'São Paulo',
  uf: 'SP',
  // PENDENTE: o DER não tem campos de logo e capa nem onde guardar as fotos (ex.: Storage do
  // Supabase). Aqui são endereços de imagem; sem logo, a tela mostra as iniciais, e sem capa,
  // a capa padrão.
  logo: logoCasaBelt,
  capa: '',
}

// Cópia no navegador. Fotos só entram como imagem embutida (data:); o logo padrão não é
// guardado, para continuar valendo mesmo se o arquivo do app mudar de endereço.
const CHAVE = 'zappi.estabelecimento-simulado'

function lerGuardado() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CHAVE) || 'null')
    if (!guardado || typeof guardado !== 'object') return {}
    for (const foto of ['logo', 'capa']) {
      if (foto in guardado && guardado[foto] !== '' && !String(guardado[foto]).startsWith('data:')) delete guardado[foto]
    }
    return guardado
  } catch {
    return {}
  }
}

function guardar(dados) {
  try {
    const copia = { ...dados }
    for (const foto of ['logo', 'capa']) {
      if (copia[foto] && !String(copia[foto]).startsWith('data:')) delete copia[foto]
    }
    localStorage.setItem(CHAVE, JSON.stringify(copia))
  } catch {
    // Sem espaço ou sem armazenamento: os dados continuam valendo até recarregar a página
  }
}

let simulado = { ...DADOS_INICIAIS, ...(import.meta.env.DEV ? lerGuardado() : {}) }

// A foto escolhida na tela é um endereço temporário (blob:), que some ao recarregar. Para
// guardar, ela vira uma imagem embutida, reduzida para caber no espaço do navegador
// (logo com até 320 px e capa com até 1600 px de largura).
async function fotoParaGuardar(url, larguraMaxima) {
  if (!url || !String(url).startsWith('blob:')) return url
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

// Link já usado por outro estabelecimento, só para testar a mensagem de link repetido
const LINKS_EM_USO = ['doces-da-ana']

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms))

// Quem mostra a marca da loja (topo do painel e login) é avisado quando o Meu
// estabelecimento é salvo, para o nome e o logo mudarem na hora em todas as telas.
const ouvintes = new Set()
export function ouvirEstabelecimento(aoMudar) {
  ouvintes.add(aoMudar)
  return () => ouvintes.delete(aoMudar)
}

// Nome e logo da loja, os mesmos do Meu estabelecimento. O login também usa, antes de entrar.
// PENDENTE: com a ZAP-36, isto vira uma rota pública da API por loja (ex.: pelo link do
// cardápio), já que no login a loja ainda não é conhecida pela sessão.
export async function buscarMarcaLoja() {
  if (!import.meta.env.DEV) throw new ServicoIndisponivelError()
  return { nome: simulado.nome, logo: simulado.logo }
}

export async function buscarEstabelecimento() {
  if (!import.meta.env.DEV) throw new ServicoIndisponivelError()
  await esperar(400)
  return { ...simulado }
}

export async function salvarEstabelecimento(dados) {
  if (!import.meta.env.DEV) throw new ServicoIndisponivelError()
  await esperar(700)
  if (LINKS_EM_USO.includes(dados.slug)) throw new LinkEmUsoError()
  simulado = { ...dados, logo: await fotoParaGuardar(dados.logo, 320), capa: await fotoParaGuardar(dados.capa, 1600) }
  guardar(simulado)
  ouvintes.forEach((aoMudar) => aoMudar({ nome: simulado.nome, logo: simulado.logo }))
  return { ...simulado }
}
