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
// | { tipo: 'lista', itens, letras }. Linhas seguidas do mesmo parágrafo viram um só.
export function lerBlocos(markdown) {
  const blocos = []
  let paragrafo = []
  let lista = null
  const fecharParagrafo = () => {
    if (paragrafo.length) blocos.push({ tipo: 'paragrafo', texto: paragrafo.join(' ') })
    paragrafo = []
  }
  const fecharLista = () => {
    if (lista) blocos.push(lista)
    lista = null
  }

  for (const linha of markdown.replace(/\r\n/g, '\n').split('\n')) {
    const texto = linha.trim()
    const titulo = texto.match(/^(#{1,3}) (.*)$/)
    if (!texto) {
      fecharParagrafo()
      fecharLista()
    } else if (titulo) {
      fecharParagrafo()
      fecharLista()
      blocos.push({ tipo: 'titulo', nivel: titulo[1].length, texto: titulo[2] })
    } else if (texto === '---') {
      fecharParagrafo()
      fecharLista()
      blocos.push({ tipo: 'linha' })
    } else if (texto.startsWith('> ')) {
      fecharParagrafo()
      fecharLista()
      blocos.push({ tipo: 'resumo', texto: texto.slice(2) })
    } else if (texto.startsWith('- ')) {
      fecharParagrafo()
      // Itens que já começam com (a), (i)... não levam a bolinha
      lista ??= { tipo: 'lista', itens: [], letras: texto.startsWith('- (') }
      lista.itens.push(texto.slice(2))
    } else {
      fecharLista()
      paragrafo.push(texto)
    }
  }
  fecharParagrafo()
  fecharLista()
  return blocos
}

// Divide uma linha em pedaços: { tipo: 'texto' | 'negrito' | 'codigo', texto } ou
// { tipo: 'link', texto, destino, externo }. O negrito pode ter um link dentro? Não nos textos de
// hoje; se aparecer, o link fica como texto, sem quebrar a página.
export function lerTrechos(linha) {
  const trechos = []
  const padrao = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g
  let inicio = 0
  for (const achado of linha.matchAll(padrao)) {
    if (achado.index > inicio) trechos.push({ tipo: 'texto', texto: linha.slice(inicio, achado.index) })
    if (achado[1] !== undefined) trechos.push({ tipo: 'negrito', texto: achado[1] })
    else if (achado[2] !== undefined) trechos.push({ tipo: 'codigo', texto: achado[2] })
    else {
      const destino = PAGINA_DO_ARQUIVO[achado[4]] ?? achado[4]
      trechos.push({ tipo: 'link', texto: achado[3], destino, externo: /^https?:\/\//.test(destino) })
    }
    inicio = achado.index + achado[0].length
  }
  if (inicio < linha.length) trechos.push({ tipo: 'texto', texto: linha.slice(inicio) })
  return trechos
}
