// Leitura e gravação dos produtos do cardápio do estabelecimento da usuária logada.
// PENDENTE: as APIs são a ZAP-39 (produtos) e a ZAP-40 (envio da foto para o Storage), que ainda
// não existem. Enquanto isso, no modo de desenvolvimento os produtos são simulados com o cardápio
// de exemplo (seção 2.2 do context.md), guardados só na memória; fora dele, a tela avisa que o
// serviço não está disponível. Quando as APIs ficarem prontas, só este arquivo muda.

import fotoBrigadeiro from '../assets/bolo-brigadeiro.jpg'
import fotoCenoura from '../assets/bolo-cenoura.jpg'
import fotoNinho from '../assets/bolo-ninho.jpg'

export class ServicoIndisponivelError extends Error {}
export class ProdutoNaoEncontradoError extends Error {}

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms))
const copia = (valor) => structuredClone(valor)

// Campos com os nomes da tela; a ZAP-39 converte das colunas de `produto` (unidade_medida_id,
// foto_caminho, foto_texto_alternativo). Brigadeiro e Ninho têm os preços reais da Casa Belt;
// cenoura e coxinha são exemplos fictícios.
function produtosSimulados() {
  return [
    {
      id: 1, nome: 'Bolo', sabor: 'Brigadeiro de chocolate', unidade: 'KG', preco: 100, ativo: true,
      descricao: 'Massa de chocolate, recheio de brigadeiro e cobertura de granulado.',
      foto: fotoBrigadeiro, textoAlternativo: 'Bolo de brigadeiro coberto com granulado e brigadeiros por cima',
    },
    {
      id: 2, nome: 'Bolo', sabor: 'Ninho com morango', unidade: 'KG', preco: 115, ativo: true,
      descricao: 'Massa branca, recheio de leite Ninho com morangos e chantilly.',
      foto: fotoNinho, textoAlternativo: 'Bolo branco de leite Ninho decorado com morangos e chantilly',
    },
    {
      id: 3, nome: 'Bolo', sabor: 'Cenoura com chocolate', unidade: 'KG', preco: 95, ativo: true,
      descricao: 'Massa de cenoura com cobertura de chocolate e granulado.',
      foto: fotoCenoura, textoAlternativo: 'Bolo de cenoura com calda de chocolate escorrendo e granulado',
    },
    { id: 4, nome: 'Salgado', sabor: 'Coxinha de frango', unidade: 'UN', preco: 1.2, ativo: true, descricao: '', foto: '', textoAlternativo: '' },
  ]
}

let simulados = null
const lista = () => (simulados ??= produtosSimulados())

function encontrar(id) {
  const produto = lista().find((p) => p.id === id && p.ativo)
  if (!produto) throw new ProdutoNaoEncontradoError()
  return produto
}

// Só os ativos: os excluídos saem do cardápio (RN14)
export async function buscarProdutos() {
  if (!import.meta.env.DEV) throw new ServicoIndisponivelError()
  await esperar(400)
  return copia(lista().filter((p) => p.ativo))
}

export async function buscarProduto(id) {
  if (!import.meta.env.DEV) throw new ServicoIndisponivelError()
  await esperar(300)
  return copia(encontrar(id))
}

// Sem id, cadastra; com id, edita. Sem foto, a descrição da foto fica vazia (RN15).
// PENDENTE (ZAP-40): aqui a foto é um endereço local (blob:); na API, o arquivo vai para o Storage.
export async function salvarProduto(dados) {
  if (!import.meta.env.DEV) throw new ServicoIndisponivelError()
  await esperar(700)
  const campos = { ...dados, textoAlternativo: dados.foto ? dados.textoAlternativo : '' }
  if (dados.id) {
    const produto = encontrar(dados.id)
    Object.assign(produto, campos)
    return copia(produto)
  }
  const novo = { ...campos, id: Math.max(0, ...lista().map((p) => p.id)) + 1, ativo: true }
  lista().push(novo)
  return copia(novo)
}

// Exclusão lógica (RN14): o produto some do cardápio, mas continua nos pedidos antigos
export async function excluirProduto(id) {
  if (!import.meta.env.DEV) throw new ServicoIndisponivelError()
  await esperar(500)
  encontrar(id).ativo = false
}
