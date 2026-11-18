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

    expect(blocos).toEqual([
      { tipo: 'titulo', nivel: 1, texto: 'Título' },
      { tipo: 'paragrafo', texto: '**Versão 1**' },
      { tipo: 'titulo', nivel: 2, texto: '1. Seção' },
      { tipo: 'resumo', texto: '**Em resumo:** curto.' },
      { tipo: 'paragrafo', texto: 'Linha um continua.' },
      { tipo: 'lista', itens: ['(a) primeiro;', '(b) segundo.'], letras: true },
      { tipo: 'lista', itens: ['solto'], letras: false },
      { tipo: 'linha' },
    ])
  })

  test('negrito, código e links: o .md de um texto vira a página do outro, e o link de fora é marcado', () => {
    expect(lerTrechos('Veja os [Termos de uso](termos-de-uso.md), a **ANPD** em [gov.br/anpd](https://www.gov.br/anpd) e `/privacidade`.')).toEqual([
      { tipo: 'texto', texto: 'Veja os ' },
      { tipo: 'link', texto: 'Termos de uso', destino: '/termos', externo: false },
      { tipo: 'texto', texto: ', a ' },
      { tipo: 'negrito', texto: 'ANPD' },
      { tipo: 'texto', texto: ' em ' },
      { tipo: 'link', texto: 'gov.br/anpd', destino: 'https://www.gov.br/anpd', externo: true },
      { tipo: 'texto', texto: ' e ' },
      { tipo: 'codigo', texto: '/privacidade' },
      { tipo: 'texto', texto: '.' },
    ])
  })

  test('os dois textos começam pelo título e pela versão, e todos os links apontam para as páginas', () => {
    for (const { texto } of Object.values(DOCUMENTOS)) {
      const blocos = lerBlocos(texto)
      expect(blocos[0]).toMatchObject({ tipo: 'titulo', nivel: 1 })
      expect(blocos[1].texto).toMatch(/^\*\*Versão \d+ · Última alteração: /)
      const links = blocos.flatMap((b) => [b.texto ?? '', ...(b.itens ?? [])]).flatMap(lerTrechos).filter((t) => t.tipo === 'link')
      for (const link of links) expect(link.destino).toMatch(/^(\/termos|\/privacidade|https:\/\/)/)
    }
  })
})
