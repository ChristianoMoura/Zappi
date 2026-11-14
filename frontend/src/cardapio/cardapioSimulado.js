// Cardápio simulado, só para o modo de desenvolvimento, enquanto a rota pública não existe
// (ZAP-104). Usa os produtos do seed (V2) e o logo e a capa da Casa Belt. Fica num arquivo à
// parte e é carregado só quando preciso, para não entrar no pacote de produção.
import bolo from '../assets/bolo-brigadeiro.jpg'
import ninho from '../assets/bolo-ninho.jpg'
import capa from '../assets/capa-estabelecimento.webp'
import coxinhas from '../assets/cento-coxinha.jpg'
import logo from '../assets/logo-casa-belt.webp'
import { CardapioNaoEncontradoError } from './servicoCardapio'

const CASA_BELT = {
  estabelecimento: {
    nome: 'Casa Belt',
    slug: 'casa-belt',
    descricao: 'Bolos e salgados artesanais sob encomenda.',
    whatsapp: '5511900000000',
    logo,
    capa,
  },
  produtos: [
    {
      id: 1,
      nome: 'Bolo',
      sabor: 'Brigadeiro de chocolate',
      unidade: 'KG',
      preco: 100,
      descricao: 'Massa de chocolate, recheio de brigadeiro e cobertura de granulado.',
      foto: bolo,
      textoAlternativo: 'Bolo de brigadeiro coberto com granulado e brigadeiros por cima',
      alergenos: ['GLUTEN', 'LEITE', 'OVOS'],
      outrosAlergenos: '',
    },
    {
      id: 2,
      nome: 'Bolo',
      sabor: 'Ninho com morango',
      unidade: 'KG',
      preco: 115,
      descricao: 'Recheio de leite Ninho com morango.',
      foto: ninho,
      textoAlternativo: 'Bolo branco de leite Ninho decorado com morangos e chantilly',
      alergenos: ['GLUTEN', 'LEITE', 'OVOS'],
      outrosAlergenos: '',
    },
    {
      id: 3,
      nome: 'Salgado',
      sabor: 'Cento de coxinha',
      unidade: 'UN',
      preco: 120,
      descricao: 'Cem coxinhas de frango.',
      foto: coxinhas,
      textoAlternativo: 'Travessa branca com cerca de cem coxinhas douradas',
      alergenos: ['GLUTEN', 'LEITE', 'OVOS'],
      outrosAlergenos: '',
    },
    {
      id: 4,
      nome: 'Salgado',
      sabor: 'Coxinha por unidade',
      unidade: 'UN',
      preco: 1.25,
      descricao: 'Coxinha de frango, vendida por unidade.',
      foto: '',
      textoAlternativo: '',
      alergenos: ['GLUTEN', 'LEITE', 'OVOS'],
      outrosAlergenos: '',
    },
  ],
}

// Simula a espera do backend gratuito acordando, para dar para ver o estado de carregamento
const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms))

export async function cardapioSimulado(slug) {
  await esperar(600)
  if (slug !== CASA_BELT.estabelecimento.slug) throw new CardapioNaoEncontradoError()
  return structuredClone(CASA_BELT)
}
