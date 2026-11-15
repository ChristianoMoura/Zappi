// Regras dos produtos do cardápio (ZAP-27, tabela `produto` do context.md). O backend (ZAP-39)
// valida de novo; aqui as regras servem para avisar a Lídia antes de salvar.

// O nome é o nome completo do produto, sem o campo sabor (ZAP-136): 150 caracteres cabem o nome e o
// sabor antigos juntos, como a migração da ZAP-137 monta
export const LIMITES = { nome: 150, descricao: 500, outrosAlergenos: 300, textoAlternativo: 150 }

// Lista fixa de alérgenos (ZAP-128): os mais comuns em padaria e confeitaria. O glúten faz parte
// da lista; sem marcar, fica entendido que o produto não contém glúten.
export const ALERGENOS = [
  { codigo: 'GLUTEN', nome: 'Glúten', selo: 'Contém glúten' },
  { codigo: 'LEITE', nome: 'Leite e derivados', selo: 'Leite e derivados' },
  { codigo: 'OVOS', nome: 'Ovos', selo: 'Ovos' },
  { codigo: 'SOJA', nome: 'Soja', selo: 'Soja' },
  { codigo: 'AMENDOIM', nome: 'Amendoim', selo: 'Amendoim' },
  { codigo: 'CASTANHAS', nome: 'Castanhas e nozes', selo: 'Castanhas e nozes' },
  { codigo: 'GERGELIM', nome: 'Gergelim', selo: 'Gergelim' },
]

// Códigos conhecidos, sem repetir e na ordem da lista (a API recebe e devolve nessa forma)
export const ordenarAlergenos = (codigos) => ALERGENOS.map((a) => a.codigo).filter((codigo) => (codigos ?? []).includes(codigo))

// Unidades de medida do seed (seção 5.3): 1-KG aceita fração, 2-UN não (RN12)
export const UNIDADES = {
  KG: { rotuloOpcao: 'Quilo (kg)', rotuloPreco: 'Preço por kg', selo: 'por kg' },
  UN: { rotuloOpcao: 'Unidade', rotuloPreco: 'Preço por unidade', selo: 'por unidade' },
}

// Ordem dos campos na tela, usada para levar o foco ao primeiro erro (NBR 17225 5.1.4)
export const ORDEM_CAMPOS = ['nome', 'categoriaId', 'preco', 'descricao', 'outrosAlergenos', 'textoAlternativo']

const formatoPreco = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const precoParaTela = (valor) => formatoPreco.format(valor)

// Lê o preço como a Lídia digita: "100", "100,5", "1.250,00" ou "R$ 100,00".
// Devolve null se estiver vazio e NaN se não for um número.
export function lerPreco(texto) {
  const semEspaco = String(texto ?? '').replace(/\s/g, '').replace(/^R\$/i, '')
  // "100.50", com ponto e até 2 casas, também vale como decimal
  const decimalComPonto = !semEspaco.includes(',') && /^\d+\.\d{1,2}$/.test(semEspaco)
  const limpo = decimalComPonto ? semEspaco : semEspaco.replace(/\./g, '').replace(',', '.')
  if (!limpo) return null
  if (!/^\d+(\.\d+)?$/.test(limpo)) return NaN
  return Math.round(Number(limpo) * 100) / 100
}

// Sugestão para a descrição da foto, que a Lídia pode melhorar (RN15): o nome do produto
export const sugerirTextoAlternativo = ({ nome }) => nome.trim()

// Recebe os dados como a tela os mostra e devolve { campo: mensagem }
export function validarProduto(dados) {
  const erros = {}
  if (!dados.nome.trim()) erros.nome = 'Escreva o nome do produto. Ex.: Bolo de brigadeiro de chocolate.'
  // Todo produto pertence a uma categoria da loja (ZAP-136)
  if (!dados.categoriaId) erros.categoriaId = 'Escolha a categoria do produto.'

  const preco = lerPreco(dados.preco)
  if (preco === null) erros.preco = 'Escreva o preço. Ex.: 100,00.'
  else if (Number.isNaN(preco)) erros.preco = 'Use só números e vírgula. Ex.: 100,00.'
  else if (preco <= 0) erros.preco = 'O preço precisa ser maior que zero (RN13).'
  else if (preco >= 100000000) erros.preco = 'Confira o preço: ele está alto demais.'

  if (dados.foto && !dados.textoAlternativo.trim()) {
    erros.textoAlternativo = 'Descreva a foto em poucas palavras. Ex.: Bolo de brigadeiro coberto com granulado.'
  }

  for (const [campo, limite] of Object.entries(LIMITES)) {
    if (!erros[campo] && String(dados[campo] ?? '').length > limite) erros[campo] = `Use no máximo ${limite} caracteres.`
  }
  return erros
}

// Preço promocional (ZAP-152, ZAP-161). O backend só manda o campo `precoPromocional` (nulo sem
// promoção) quando já tem a promoção (ZAP-160); sem o campo, a tela não mostra o desconto.
export const temPromocaoNaApi = (produto) => produto?.precoPromocional !== undefined
export const emPromocao = (produto) => produto?.precoPromocional != null
// O preço que vale para pedido novo: o com desconto, se houver (o backend decide, RN10)
export const precoVigente = (produto) => (emPromocao(produto) ? produto.precoPromocional : produto.preco)

// Recebe os dois preços como a Lídia digitou e devolve { campo: mensagem }
export function validarPromocao({ preco, precoPromocional }) {
  const erros = {}
  const antes = lerPreco(preco)
  const desconto = lerPreco(precoPromocional)
  if (antes === null) erros.preco = 'Escreva o preço antes da promoção. Ex.: 100,00.'
  else if (Number.isNaN(antes)) erros.preco = 'Use só números e vírgula. Ex.: 100,00.'
  else if (antes <= 0) erros.preco = 'O preço precisa ser maior que zero.'

  if (desconto === null) erros.precoPromocional = 'Escreva o preço com desconto. Ex.: 80,00.'
  else if (Number.isNaN(desconto)) erros.precoPromocional = 'Use só números e vírgula. Ex.: 80,00.'
  else if (desconto <= 0) erros.precoPromocional = 'O preço com desconto precisa ser maior que zero.'
  else if (!erros.preco && desconto >= antes) erros.precoPromocional = 'O preço com desconto precisa ser menor que o preço antes da promoção.'
  return erros
}

// Percentual de desconto do selo (ZAP-152, decisão de 15/11/2026): (normal − com desconto) ÷
// normal × 100, arredondado para baixo, para nunca anunciar um desconto maior que o real (CDC).
// A conta é feita em centavos, para a vírgula do JavaScript não virar 29,999… e cair para 29.
export function percentualDesconto(produto) {
  if (!emPromocao(produto)) return 0
  const normal = Math.round(produto.preco * 100)
  const desconto = Math.round(produto.precoPromocional * 100)
  return normal > 0 ? Math.floor(((normal - desconto) * 100) / normal) : 0
}

// "-13%", ao lado da unidade (ajuste de 15/11/2026, no lugar do selo "Promoção · 13% de desconto");
// com menos de 1% de desconto, nada
export function textoDescontoCurto(produto) {
  const percentual = percentualDesconto(produto)
  return percentual >= 1 ? `-${percentual}%` : ''
}

// O que o leitor de tela ouve no lugar do preço riscado: "De R$ 115,00 por R$ 99,90, 13% de desconto"
export function textoPrecoPromocao(produto) {
  const percentual = percentualDesconto(produto)
  const precos = `De R$ ${precoParaTela(produto.preco)} por R$ ${precoParaTela(produto.precoPromocional)}`
  return percentual >= 1 ? `${precos}, ${percentual}% de desconto` : precos
}
