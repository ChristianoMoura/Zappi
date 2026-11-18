import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { buscarCardapio } from '../cardapio/servicoCardapio'
import { renderizarComRotas } from '../testes/renderizarComRotas'
import { PaginaCardapio } from './PaginaCardapio'

// Botão de compartilhar do cardápio e do detalhe do produto (ZAP-105, ZAP-189). O compartilhar do
// aparelho (navigator.share) e a área de transferência (navigator.clipboard) são simulados, para os
// testes não dependerem do navegador ter ou não esses recursos e não abrirem janela de verdade.
vi.mock('../cardapio/servicoCardapio', async (importarOriginal) => ({
  ...(await importarOriginal()),
  buscarCardapio: vi.fn(),
}))

const CARDAPIO = {
  estabelecimento: { nome: 'Casa Belt', slug: 'casa-belt', descricao: '', whatsapp: '5511900000000', logo: '', capa: '' },
  categorias: [{ id: 1, nome: 'Bolos' }],
  produtos: [
    { id: 1, nome: 'Bolo de brigadeiro de chocolate', categoriaId: 1, categoria: 'Bolos', unidade: 'KG', preco: 100, descricao: 'Massa de chocolate.', foto: '', textoAlternativo: '' },
  ],
}

const ERRO_AO_COMPARTILHAR = 'Não foi possível compartilhar. Copie o endereço da página.'

// Os dois lugares com o botão: o mesmo roteiro de testes vale para os dois
const LUGARES = [
  {
    lugar: 'no cardápio',
    caminho: '/cardapio/casa-belt',
    botao: 'Compartilhar o cardápio',
    titulo: 'Cardápio da Casa Belt',
    copiado: 'Link do cardápio copiado.',
    esperarTela: () => screen.findByRole('heading', { level: 1, name: 'Casa Belt' }),
  },
  {
    lugar: 'no detalhe do produto',
    caminho: '/cardapio/casa-belt/produto/1',
    botao: 'Compartilhar este produto',
    titulo: 'Bolo de brigadeiro de chocolate · Casa Belt',
    copiado: 'Link do produto copiado.',
    esperarTela: () => screen.findByRole('heading', { level: 2, name: 'Bolo de brigadeiro de chocolate' }),
  },
]

// configurable: true deixa o afterEach desfazer a simulação entre um teste e outro
function simularNavegador({ share, clipboard }) {
  Object.defineProperty(navigator, 'share', { value: share, configurable: true, writable: true })
  Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true, writable: true })
}

function erroDeDesistencia() {
  const erro = new Error('A pessoa fechou o compartilhar')
  erro.name = 'AbortError'
  return erro
}

describe.each(LUGARES)('compartilhar $lugar (ZAP-189)', ({ caminho, botao, titulo, copiado, esperarTela }) => {
  // O userEvent.setup() troca o navigator.clipboard; por isso a simulação vem depois dele
  let usuario

  beforeEach(() => {
    buscarCardapio.mockResolvedValue(structuredClone(CARDAPIO))
    window.scrollTo = vi.fn()
    usuario = userEvent.setup()
  })

  afterEach(() => {
    delete navigator.share
    delete navigator.clipboard
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  async function abrirTela() {
    renderizarComRotas([{ path: '/cardapio/:slug/*', Component: PaginaCardapio }], caminho)
    await esperarTela()
  }

  test('o botão tem um nome acessível', async () => {
    simularNavegador({ share: undefined, clipboard: { writeText: vi.fn().mockResolvedValue() } })
    await abrirTela()

    expect(screen.getByRole('button', { name: botao })).toBeVisible()
  })

  test('com o compartilhar do aparelho, chama com o título e o link da página, sem aviso', async () => {
    const share = vi.fn().mockResolvedValue()
    const writeText = vi.fn()
    simularNavegador({ share, clipboard: { writeText } })
    await abrirTela()

    await usuario.click(screen.getByRole('button', { name: botao }))

    expect(share).toHaveBeenCalledWith({ title: titulo, url: window.location.href })
    expect(writeText).not.toHaveBeenCalled()
    expect(screen.queryByText(copiado)).not.toBeInTheDocument()
    expect(screen.queryByText(ERRO_AO_COMPARTILHAR)).not.toBeInTheDocument()
  })

  test('sem o compartilhar do aparelho (computador), copia o link e avisa ao leitor de tela', async () => {
    const writeText = vi.fn().mockResolvedValue()
    simularNavegador({ share: undefined, clipboard: { writeText } })
    await abrirTela()

    await usuario.click(screen.getByRole('button', { name: botao }))

    expect(writeText).toHaveBeenCalledWith(window.location.href)
    const aviso = await screen.findByText(copiado)
    // O aviso fica numa região anunciada sem tirar o foco do botão (NBR 17225, aria-live)
    expect(aviso).toHaveAttribute('role', 'status')
    expect(aviso).toHaveAttribute('aria-live', 'polite')
  })

  test('erro ao copiar mostra como compartilhar à mão', async () => {
    simularNavegador({ share: undefined, clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Sem permissão')) } })
    await abrirTela()

    await usuario.click(screen.getByRole('button', { name: botao }))

    expect(await screen.findByText(ERRO_AO_COMPARTILHAR)).toHaveAttribute('role', 'status')
    expect(screen.queryByText(copiado)).not.toBeInTheDocument()
  })

  test('erro no compartilhar do aparelho também mostra como compartilhar à mão', async () => {
    simularNavegador({ share: vi.fn().mockRejectedValue(new Error('Falhou')), clipboard: { writeText: vi.fn() } })
    await abrirTela()

    await usuario.click(screen.getByRole('button', { name: botao }))

    expect(await screen.findByText(ERRO_AO_COMPARTILHAR)).toBeVisible()
  })

  test('quem desiste de compartilhar não vê aviso de erro', async () => {
    const share = vi.fn().mockRejectedValue(erroDeDesistencia())
    const writeText = vi.fn()
    simularNavegador({ share, clipboard: { writeText } })
    await abrirTela()

    await usuario.click(screen.getByRole('button', { name: botao }))

    expect(share).toHaveBeenCalledTimes(1)
    expect(writeText).not.toHaveBeenCalled()
    expect(screen.queryByText(ERRO_AO_COMPARTILHAR)).not.toBeInTheDocument()
    expect(screen.queryByText(copiado)).not.toBeInTheDocument()
  })
})
