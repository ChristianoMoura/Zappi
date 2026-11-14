// Regras dos produtos do cardápio (ZAP-27, tabela `produto` do context.md). O backend (ZAP-39)
// valida de novo; aqui as regras servem para avisar a Lídia antes de salvar.

export const LIMITES = { nome: 100, sabor: 100, descricao: 500, outrosAlergenos: 300, textoAlternativo: 150 }

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
export const ORDEM_CAMPOS = ['nome', 'sabor', 'preco', 'descricao', 'outrosAlergenos', 'textoAlternativo']

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

// Nome da tela: "Bolo de brigadeiro de chocolate", "Salgado de coxinha de frango"
export const nomeCompleto = ({ nome, sabor }) => `${nome.trim()} de ${sabor.trim().charAt(0).toLowerCase()}${sabor.trim().slice(1)}`

// Sugestão para a descrição da foto, que a Lídia pode melhorar (RN15)
export function sugerirTextoAlternativo({ nome, sabor }) {
  if (!sabor.trim()) return nome.trim()
  if (!nome.trim()) return sabor.trim()
  return nomeCompleto({ nome, sabor })
}

// Recebe os dados como a tela os mostra e devolve { campo: mensagem }
export function validarProduto(dados) {
  const erros = {}
  if (!dados.nome.trim()) erros.nome = 'Escreva o nome do produto. Ex.: Bolo ou Salgado.'
  if (!dados.sabor.trim()) erros.sabor = 'Escreva o sabor. Ex.: Brigadeiro de chocolate ou Coxinha de frango.'

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
