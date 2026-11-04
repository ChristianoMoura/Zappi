// Leitura e gravação dos dados do estabelecimento da usuária logada.
// PENDENTE: a API é a ZAP-36, que ainda não existe. Enquanto isso, no modo de
// desenvolvimento os dados são simulados com a Casa Belt do seed (dados fictícios),
// guardados só na memória; fora dele, a tela avisa que o serviço não está disponível.
// Quando a ZAP-36 ficar pronta, só este arquivo muda.

import logoCasaBelt from '../assets/logo-casa-belt.webp'

export class ServicoIndisponivelError extends Error {}
export class LinkEmUsoError extends Error {}

// Campos com os nomes da tela; a ZAP-36 converte para as colunas da tabela `estabelecimento`
let simulado = {
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

// Link já usado por outro estabelecimento, só para testar a mensagem de link repetido
const LINKS_EM_USO = ['doces-da-ana']

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms))

export async function buscarEstabelecimento() {
  if (!import.meta.env.DEV) throw new ServicoIndisponivelError()
  await esperar(400)
  return { ...simulado }
}

export async function salvarEstabelecimento(dados) {
  if (!import.meta.env.DEV) throw new ServicoIndisponivelError()
  await esperar(700)
  if (LINKS_EM_USO.includes(dados.slug)) throw new LinkEmUsoError()
  simulado = { ...dados }
  return { ...simulado }
}
