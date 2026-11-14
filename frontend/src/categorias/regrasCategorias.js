// Regras das categorias do cardápio (ZAP-136). O backend (ZAP-138) valida de novo; aqui servem
// para avisar a Lídia antes de salvar.

export const LIMITE_NOME = 60

const comparavel = (texto) => texto.trim().toLocaleLowerCase('pt-BR')

// Devolve a mensagem de erro do nome, ou '' se estiver certo. `id` é o da categoria em edição.
export function validarNomeCategoria(nome, categorias, id = null) {
  const limpo = nome.trim()
  if (!limpo) return 'Escreva o nome da categoria. Ex.: Bolos ou Salgados.'
  if (limpo.length > LIMITE_NOME) return `Use no máximo ${LIMITE_NOME} caracteres.`
  if (categorias.some((c) => c.id !== id && comparavel(c.nome) === comparavel(limpo))) return `Já existe a categoria "${limpo}".`
  return ''
}

// Copia a lista com o item da posição `de` levado para a posição `para`
export function moverNaLista(lista, de, para) {
  const nova = [...lista]
  const [item] = nova.splice(de, 1)
  nova.splice(para, 0, item)
  return nova
}

// Produtos da API (já na ordem das categorias) em grupos, um por categoria, na mesma ordem
export function agruparPorCategoria(produtos) {
  const grupos = []
  for (const produto of produtos) {
    const categoria = produto.categoria ?? { id: 0, nome: 'Sem categoria' }
    const ultimo = grupos.at(-1)
    if (ultimo?.categoria.id === categoria.id) ultimo.produtos.push(produto)
    else grupos.push({ categoria, produtos: [produto] })
  }
  return grupos
}

export const quantidadeTexto = (n) => `${n} ${n === 1 ? 'produto' : 'produtos'}`
