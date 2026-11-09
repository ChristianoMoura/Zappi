// Leitura e gravação dos produtos do cardápio do estabelecimento da usuária logada, pelas
// rotas /api/produtos (ZAP-39) e /api/produtos/{id}/foto (ZAP-40). Em produção, o Render
// repassa /api ao backend; em desenvolvimento, o proxy do Vite faz o mesmo (vite.config.js).
// As páginas continuam usando as mesmas funções e erros de antes. O token, o 401 e a falta de
// conexão ficam no clienteApi, o mesmo do Meu estabelecimento.

import { chamarApi, lerArquivoTemporario, ServicoIndisponivelError } from '../autenticacao/clienteApi'

export { ServicoIndisponivelError, SessaoExpiradaError } from '../autenticacao/clienteApi'
export class ProdutoNaoEncontradoError extends Error {}

async function chamar(caminho, opcoes) {
  const resposta = await chamarApi(`/produtos${caminho}`, opcoes)
  // Inexistente, já excluído ou de outro estabelecimento (RN01)
  if (resposta.status === 404) throw new ProdutoNaoEncontradoError()
  if (!resposta.ok) throw new ServicoIndisponivelError()
  return resposta.status === 204 ? null : resposta.json()
}

// O backend manda nulo nos campos vazios; a tela trabalha com texto vazio
function paraTela(produto) {
  return {
    ...produto,
    descricao: produto.descricao ?? '',
    foto: produto.foto ?? '',
    textoAlternativo: produto.textoAlternativo ?? '',
  }
}

// A foto escolhida na tela é um endereço temporário (blob:); o arquivo vai para o backend,
// que confere o tipo e o tamanho e envia para o Storage (ZAP-40)
async function enviarFoto(id, enderecoTemporario, textoAlternativo) {
  const formulario = new FormData()
  formulario.append('arquivo', await lerArquivoTemporario(enderecoTemporario), 'foto')
  formulario.append('textoAlternativo', textoAlternativo)
  return chamar(`/${id}/foto`, { metodo: 'POST', formulario })
}

// Só os ativos: os excluídos saem do cardápio (RN14)
export async function buscarProdutos() {
  return (await chamar('')).map(paraTela)
}

export async function buscarProduto(id) {
  return paraTela(await chamar(`/${id}`))
}

// Sem id, cadastra; com id, edita. Sem foto, a descrição da foto fica vazia (RN15).
export async function salvarProduto(dados) {
  const temFotoNova = String(dados.foto ?? '').startsWith('blob:')
  const corpo = {
    nome: dados.nome,
    sabor: dados.sabor,
    unidade: dados.unidade,
    preco: dados.preco,
    descricao: dados.descricao,
    textoAlternativo: dados.foto ? dados.textoAlternativo : '',
  }

  if (dados.id) {
    // A foto foi removida: tira antes de salvar, porque o backend não aceita apagar a
    // descrição de um produto que ainda tem foto (RN15)
    if (!dados.foto) await chamar(`/${dados.id}/foto`, { metodo: 'DELETE' })
    let salvo = await chamar(`/${dados.id}`, { metodo: 'PUT', json: corpo })
    if (temFotoNova) salvo = await enviarFoto(dados.id, dados.foto, dados.textoAlternativo)
    return paraTela(salvo)
  }

  const criado = await chamar('', { metodo: 'POST', json: corpo })
  if (!temFotoNova) return paraTela(criado)
  try {
    return paraTela(await enviarFoto(criado.id, dados.foto, dados.textoAlternativo))
  } catch (erro) {
    // Sem a foto, desfaz o cadastro, para tentar de novo não criar o produto duas vezes
    await chamar(`/${criado.id}`, { metodo: 'DELETE' }).catch(() => {})
    throw erro
  }
}

// Exclusão lógica (RN14): o produto some do cardápio, mas continua nos pedidos antigos
export async function excluirProduto(id) {
  await chamar(`/${id}`, { metodo: 'DELETE' })
}
