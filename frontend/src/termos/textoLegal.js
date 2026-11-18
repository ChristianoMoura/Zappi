// Termos de uso e política de privacidade nas páginas /termos e /privacidade (ZAP-148). Os textos
// ficam em docs/ (ZAP-144) e têm uma cópia em ./textos, porque o Docker do front só enxerga a pasta
// frontend. O teste textoLegal.test.js falha se a cópia ficar diferente de docs/.
//
// O Markdown dos textos usa pouca coisa: títulos (#, ##, ###), parágrafos, listas (- ...),
// resumos (> ...), linha (---), **negrito**, `código` e [links](...). Este leitor cobre só isso.

import politica from './textos/politica-de-privacidade.md?raw'
import termos from './textos/termos-de-uso.md?raw'

export const DOCUMENTOS = {
  termos: { texto: termos, titulo: 'Termos de uso', caminho: '/termos' },
  privacidade: { texto: politica, titulo: 'Política de privacidade', caminho: '/privacidade' },
}

// Um texto aponta para o outro pelo arquivo .md; na tela, o link vai para a página
const PAGINA_DO_ARQUIVO = { 'termos-de-uso.md': '/termos', 'politica-de-privacidade.md': '/privacidade' }

// Divide o Markdown em blocos: { tipo: 'titulo', nivel, texto } | 'paragrafo' | 'resumo' | 'linha'
// | { tipo: 'lista', itens: [{ texto, linha }], letras }. Linhas seguidas do mesmo parágrafo viram um
// só. Cada bloco e cada item guarda a linha do arquivo onde começa: ela não muda com a lista e
// serve de chave na tela.
export function lerBlocos(markdown) {
  const blocos = []
  let paragrafo = null
  let lista = null
  const fecharParagrafo = () => {
    if (paragrafo) blocos.push({ tipo: 'paragrafo', linha: paragrafo.linha, texto: paragrafo.partes.join(' ') })
    paragrafo = null
  }
  const fecharLista = () => {
    if (lista) blocos.push(lista)
    lista = null
  }

  markdown
    .replaceAll('\r\n', '\n')
    .split('\n')
    .forEach((conteudo, indice) => {
      const linha = indice + 1
      const texto = conteudo.trim()
      const titulo = texto.match(/^(#{1,3}) (.*)$/)
      if (!texto) {
        fecharParagrafo()
        fecharLista()
      } else if (titulo) {
        fecharParagrafo()
        fecharLista()
        blocos.push({ tipo: 'titulo', linha, nivel: titulo[1].length, texto: titulo[2] })
      } else if (texto === '---') {
        fecharParagrafo()
        fecharLista()
        blocos.push({ tipo: 'linha', linha })
      } else if (texto.startsWith('> ')) {
        fecharParagrafo()
        fecharLista()
        blocos.push({ tipo: 'resumo', linha, texto: texto.slice(2) })
      } else if (texto.startsWith('- ')) {
        fecharParagrafo()
        // Itens que já começam com (a), (i)... não levam a bolinha
        lista ??= { tipo: 'lista', linha, itens: [], letras: texto.startsWith('- (') }
        lista.itens.push({ texto: texto.slice(2), linha })
      } else {
        fecharLista()
        paragrafo ??= { linha, partes: [] }
        paragrafo.partes.push(texto)
      }
    })
  fecharParagrafo()
  fecharLista()
  return blocos
}

// Divide uma linha em pedaços: { tipo: 'texto' | 'negrito' | 'codigo', texto, posicao } ou
// { tipo: 'link', texto, destino, externo, posicao }. A posição é onde o pedaço começa na linha e
// serve de chave na tela. O negrito pode ter um link dentro? Não nos textos de hoje; se aparecer, o
// link fica como texto, sem quebrar a página.
//
// A leitura é feita com indexOf, sem uma expressão regular única: a regex que juntava os três
// casos podia ficar lenta (backtracking), e o SonarCloud barrou o PR por isso.
export function lerTrechos(linha) {
  const trechos = []
  let inicio = 0
  let posicao = 0
  while (posicao < linha.length) {
    const achado = lerMarcacao(linha, posicao)
    if (achado) {
      if (posicao > inicio) trechos.push({ tipo: 'texto', texto: linha.slice(inicio, posicao), posicao: inicio })
      trechos.push({ ...achado.trecho, posicao })
      posicao = achado.fim
      inicio = posicao
    } else {
      posicao += 1
    }
  }
  if (inicio < linha.length) trechos.push({ tipo: 'texto', texto: linha.slice(inicio), posicao: inicio })
  return trechos
}

// Lê a marcação que começa na posição: **negrito**, `código` ou [texto](destino), sempre com
// algum conteúdo dentro. Devolve o trecho e onde a marcação termina, ou nulo se ali não começa
// nenhuma (aí o caractere fica como texto).
function lerMarcacao(linha, posicao) {
  if (linha.startsWith('**', posicao)) {
    const fim = linha.indexOf('*', posicao + 2)
    if (fim <= posicao + 2 || !linha.startsWith('**', fim)) return null
    return { trecho: { tipo: 'negrito', texto: linha.slice(posicao + 2, fim) }, fim: fim + 2 }
  }
  if (linha[posicao] === '`') {
    const fim = linha.indexOf('`', posicao + 1)
    if (fim <= posicao + 1) return null
    return { trecho: { tipo: 'codigo', texto: linha.slice(posicao + 1, fim) }, fim: fim + 1 }
  }
  if (linha[posicao] === '[') {
    const fimTexto = linha.indexOf(']', posicao + 1)
    if (fimTexto <= posicao + 1 || linha[fimTexto + 1] !== '(') return null
    const fimDestino = linha.indexOf(')', fimTexto + 2)
    if (fimDestino <= fimTexto + 2) return null
    const arquivo = linha.slice(fimTexto + 2, fimDestino)
    const destino = PAGINA_DO_ARQUIVO[arquivo] ?? arquivo
    const externo = destino.startsWith('https://') || destino.startsWith('http://')
    return { trecho: { tipo: 'link', texto: linha.slice(posicao + 1, fimTexto), destino, externo }, fim: fimDestino + 1 }
  }
  return null
}
