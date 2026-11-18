import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import { DOCUMENTOS, lerBlocos, lerTrechos } from './textoLegal'

const DOCS = resolve(__dirname, '../../../docs')
const temDocs = existsSync(DOCS)

describe('textos dos termos e da privacidade (ZAP-148)', () => {
  // A página mostra a cópia de ./textos; o original fica em docs/ (ZAP-144). No Docker do front
  // a pasta docs/ não existe, e este teste fica de fora; no GitHub Actions ele roda.
  test.skipIf(!temDocs).each([
    ['termos', 'termos-de-uso.md'],
    ['privacidade', 'politica-de-privacidade.md'],
  ])('a cópia de %s é igual ao arquivo de docs/', (documento, arquivo) => {
    const original = readFileSync(resolve(DOCS, arquivo), 'utf8').replace(/\r\n/g, '\n')
    expect(DOCUMENTOS[documento].texto.replace(/\r\n/g, '\n')).toBe(original)
  })

  test('divide o Markdown em títulos, parágrafos, resumos, listas e linhas', () => {
    const blocos = lerBlocos(['# Título', '', '**Versão 1**', '', '## 1. Seção', '', '> **Em resumo:** curto.', '', 'Linha um', 'continua.', '', '- (a) primeiro;', '- (b) segundo.', '', '- solto', '', '---'].join('\r\n'))

    // Cada bloco e cada item guarda a linha do arquivo onde começa: é a chave estável na tela
    expect(blocos).toEqual([
      { tipo: 'titulo', linha: 1, nivel: 1, texto: 'Título' },
      { tipo: 'paragrafo', linha: 3, texto: '**Versão 1**' },
      { tipo: 'titulo', linha: 5, nivel: 2, texto: '1. Seção' },
      { tipo: 'resumo', linha: 7, texto: '**Em resumo:** curto.' },
      { tipo: 'paragrafo', linha: 9, texto: 'Linha um continua.' },
      { tipo: 'lista', linha: 12, itens: [{ texto: '(a) primeiro;', linha: 12 }, { texto: '(b) segundo.', linha: 13 }], letras: true },
      { tipo: 'lista', linha: 15, itens: [{ texto: 'solto', linha: 15 }], letras: false },
      { tipo: 'linha', linha: 17 },
    ])
  })

  test('nos textos de verdade, nenhum bloco nem item repete a linha, então as chaves não se repetem', () => {
    for (const { texto } of Object.values(DOCUMENTOS)) {
      const blocos = lerBlocos(texto)
      const linhas = blocos.map((b) => b.linha)
      expect(new Set(linhas).size).toBe(linhas.length)
      for (const lista of blocos.filter((b) => b.tipo === 'lista')) {
        expect(new Set(lista.itens.map((item) => item.linha)).size).toBe(lista.itens.length)
      }
    }
  })

  test('negrito, código e links: o .md de um texto vira a página do outro, e o link de fora é marcado', () => {
    expect(lerTrechos('Veja os [Termos de uso](termos-de-uso.md), a **ANPD** em [gov.br/anpd](https://www.gov.br/anpd) e `/privacidade`.')).toEqual([
      // A posição é onde cada pedaço começa na linha: a chave estável na tela
      { tipo: 'texto', texto: 'Veja os ', posicao: 0 },
      { tipo: 'link', texto: 'Termos de uso', destino: '/termos', externo: false, posicao: 8 },
      { tipo: 'texto', texto: ', a ', posicao: 41 },
      { tipo: 'negrito', texto: 'ANPD', posicao: 45 },
      { tipo: 'texto', texto: ' em ', posicao: 53 },
      { tipo: 'link', texto: 'gov.br/anpd', destino: 'https://www.gov.br/anpd', externo: true, posicao: 57 },
      { tipo: 'texto', texto: ' e ', posicao: 95 },
      { tipo: 'codigo', texto: '/privacidade', posicao: 98 },
      { tipo: 'texto', texto: '.', posicao: 112 },
    ])
  })

  test('os dois textos começam pelo título e pela versão, e todos os links apontam para as páginas', () => {
    for (const { texto } of Object.values(DOCUMENTOS)) {
      const blocos = lerBlocos(texto)
      expect(blocos[0]).toMatchObject({ tipo: 'titulo', nivel: 1 })
      expect(blocos[1].texto).toMatch(/^\*\*Versão \d+ · Última alteração: /)
      const links = blocos.flatMap((b) => [b.texto ?? '', ...(b.itens ?? []).map((item) => item.texto)]).flatMap(lerTrechos).filter((t) => t.tipo === 'link')
      for (const link of links) expect(link.destino).toMatch(/^(\/termos|\/privacidade|https:\/\/)/)
    }
  })
})
