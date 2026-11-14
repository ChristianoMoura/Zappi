// Categorias do cardápio da usuária logada, pela rota /api/categorias (ZAP-136, ZAP-138). A
// Lídia cria, renomeia, muda a ordem arrastando e exclui as
// que não têm produto. O token, o 401 e a falta de conexão ficam no clienteApi.

import { chamarApi, lerJson, ServicoIndisponivelError } from '../autenticacao/clienteApi'

export { ServicoIndisponivelError, SessaoExpiradaError } from '../autenticacao/clienteApi'
export class CategoriaNaoEncontradaError extends Error {}

// O backend recusou: nome repetido (409), categoria com produto (409) ou dados inválidos (400).
// `mensagem` vem pronta do backend; `campos` traz o erro de cada campo, quando houver.
export class CategoriaRecusadaError extends Error {
  constructor(mensagem, campos) {
    super(mensagem ?? 'Não foi possível salvar a categoria.')
    this.campos = campos ?? {}
  }
}

async function chamar(caminho, opcoes) {
  const resposta = await chamarApi(`/categorias${caminho}`, opcoes)
  if (resposta.status === 404) throw new CategoriaNaoEncontradaError()
  if (resposta.status === 400 || resposta.status === 409) {
    const corpo = await lerJson(resposta)
    throw new CategoriaRecusadaError(corpo?.mensagem, corpo?.campos)
  }
  if (!resposta.ok) throw new ServicoIndisponivelError()
  return resposta.status === 204 ? null : resposta.json()
}

const paraTela = (categoria) => ({
  id: categoria.id,
  nome: categoria.nome,
})

// Na ordem definida pela Lídia
export async function buscarCategorias() {
  return (await chamar('')).map(paraTela)
}

// Sem id, cria (entra no fim da lista); com id, renomeia
export async function salvarCategoria({ id, nome }) {
  const corpo = { nome }
  return paraTela(await chamar(id ? `/${id}` : '', { metodo: id ? 'PUT' : 'POST', json: corpo }))
}

// A nova ordem, com todos os ids, do primeiro ao último. Devolve a lista como ficou.
export async function reordenarCategorias(ids) {
  return (await chamar('/ordem', { metodo: 'PUT', json: { ids } })).map(paraTela)
}

// Exclusão lógica; com produto, o backend responde 409 com a explicação
export async function excluirCategoria(id) {
  await chamar(`/${id}`, { metodo: 'DELETE' })
}
