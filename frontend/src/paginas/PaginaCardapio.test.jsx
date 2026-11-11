import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { buscarCardapio, CardapioNaoEncontradoError, ServicoIndisponivelError } from '../cardapio/servicoCardapio'
import { renderizarComRotas } from '../testes/renderizarComRotas'
import { PaginaCardapio } from './PaginaCardapio'

// O backend é simulado aqui; as chamadas à rota pública (ZAP-104) são testadas no servicoCardapio.test.js
vi.mock('../cardapio/servicoCardapio', async (importarOriginal) => ({
  ...(await importarOriginal()),
  buscarCardapio: vi.fn(),
}))

const CARDAPIO = {
  estabelecimento: { nome: 'Casa Belt', slug: 'casa-belt', descricao: 'Bolos e salgados artesanais sob encomenda.', whatsapp: '5511900000000', logo: 'logo.webp', capa: '' },
  produtos: [
    { id: 1, nome: 'Bolo', sabor: 'Brigadeiro de chocolate', unidade: 'KG', preco: 100, descricao: 'Massa de chocolate.', foto: 'bolo.jpg', textoAlternativo: 'Bolo coberto com granulado' },
    { id: 3, nome: 'Salgado', sabor: 'Coxinha por unidade', unidade: 'UN', preco: 1.25, descricao: 'Coxinha de frango.', foto: '', textoAlternativo: '' },
  ],
}

function abrir(caminho = '/cardapio/casa-belt') {
  return renderizarComRotas([{ path: '/cardapio/:slug/:pagina?', Component: PaginaCardapio }], caminho)
}

describe('PaginaCardapio (ZAP-105)', () => {
  beforeEach(() => {
    buscarCardapio.mockResolvedValue(structuredClone(CARDAPIO))
  })

  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  test('abre sem login e mostra a loja e os produtos por categoria, com preço e unidade', async () => {
    abrir()

    expect(screen.getByRole('heading', { name: 'Abrindo o cardápio…' })).toBeVisible()
    expect(await screen.findByRole('heading', { level: 1, name: 'Casa Belt' })).toBeVisible()
    expect(buscarCardapio).toHaveBeenCalledWith('casa-belt')
    expect(screen.getByRole('img', { name: 'Logo de Casa Belt' })).toBeVisible()
    expect(screen.getByText(/pelo menos 7 dias de antecedência/)).toBeVisible()

    const bolos = screen.getByRole('region', { name: 'Bolos' })
    expect(within(bolos).getByRole('heading', { name: 'Brigadeiro de chocolate' })).toBeVisible()
    expect(within(bolos).getByText('R$ 100,00')).toBeVisible()
    expect(within(bolos).getByText('por kg')).toBeVisible()
    expect(within(bolos).getByRole('img', { name: 'Bolo coberto com granulado' })).toBeVisible()

    const salgados = screen.getByRole('region', { name: 'Salgados' })
    expect(within(salgados).getByText('Sem foto')).toBeVisible()
    expect(within(salgados).getByText('por unidade')).toBeVisible()

    expect(screen.getByRole('link', { name: /Falar com a loja no WhatsApp/ })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\/5511900000000\?text=/))
  })

  test('link de loja que não existe mostra uma mensagem clara', async () => {
    buscarCardapio.mockRejectedValue(new CardapioNaoEncontradoError())
    abrir('/cardapio/nao-existe')

    expect(await screen.findByRole('heading', { name: 'Cardápio não encontrado' })).toBeVisible()
  })

  test('erro ao carregar oferece tentar de novo', async () => {
    buscarCardapio.mockRejectedValueOnce(new ServicoIndisponivelError())
    const usuario = userEvent.setup()
    abrir()

    await usuario.click(await screen.findByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Casa Belt' })).toBeVisible()
    expect(buscarCardapio).toHaveBeenCalledTimes(2)
  })

  test('cardápio sem produtos avisa e mantém o WhatsApp', async () => {
    buscarCardapio.mockResolvedValue({ ...structuredClone(CARDAPIO), produtos: [] })
    abrir()

    expect(await screen.findByRole('heading', { name: 'Ainda não há produtos no cardápio' })).toBeVisible()
    expect(screen.getByRole('link', { name: /Falar com a loja no WhatsApp/ })).toBeVisible()
  })

  test('a busca filtra os produtos e avisa quando nada combina', async () => {
    const usuario = userEvent.setup()
    abrir()

    await usuario.click(await screen.findByRole('button', { name: 'Buscar no cardápio' }))
    const campo = screen.getByRole('searchbox', { name: 'Buscar no cardápio' })
    await usuario.type(campo, 'coxinha')

    expect(screen.queryByRole('heading', { name: 'Brigadeiro de chocolate' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Coxinha por unidade' })).toBeVisible()

    await usuario.clear(campo)
    await usuario.type(campo, 'pastel')
    expect(screen.getByText('Nenhum produto encontrado.')).toBeVisible()
  })

  test('o tema escuro alterna pelo ícone e fica guardado no navegador', async () => {
    const usuario = userEvent.setup()
    abrir()

    await usuario.click(await screen.findByRole('button', { name: 'Usar tema escuro' }))

    expect(screen.getByRole('button', { name: 'Usar tema claro' })).toBeVisible()
    expect(localStorage.getItem('zappi.cardapio.tema')).toBe('escuro')
  })

  test('o produto abre com a observação, que vai na mensagem do WhatsApp', async () => {
    const usuario = userEvent.setup()
    abrir()

    await usuario.click(await screen.findByRole('button', { name: /Brigadeiro de chocolate/ }))
    const janela = await screen.findByRole('dialog', { name: 'Brigadeiro de chocolate' })
    await usuario.type(within(janela).getByRole('textbox', { name: /Observações/ }), 'Feliz aniversário')

    const pedir = within(janela).getByRole('link', { name: /Pedir pelo WhatsApp/ })
    const texto = new URL(pedir.getAttribute('href')).searchParams.get('text')
    expect(texto).toBe('Olá! Vi o cardápio da Casa Belt no Zappi e quero encomendar: Brigadeiro de chocolate (R$ 100,00 por kg). Observação: Feliz aniversário')
  })

  test('"Mais informações" mostra as regras da encomenda, o contato e o mapa da retirada', async () => {
    const usuario = userEvent.setup()
    abrir()

    await usuario.click(await screen.findByRole('link', { name: 'Mais informações' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Informações da loja' })).toBeVisible()
    expect(screen.getByText('Encomende com pelo menos 7 dias.')).toBeVisible()
    expect(screen.getByText('Na retirada.')).toBeVisible()
    expect(screen.getByText('WhatsApp: (11) 90000-0000')).toBeVisible()
    expect(buscarCardapio).toHaveBeenCalledTimes(1)

    // O endereço do mapa é fictício e avisa isso; o da loja (casa da Lídia) não vem da API (LGPD)
    const retirada = screen.getByRole('region', { name: 'Retirada' })
    expect(within(retirada).getByText('Endereço ilustrativo')).toBeVisible()
    expect(within(retirada).getByTitle(/Mapa do local de retirada/)).toHaveAttribute('src', expect.stringContaining('openstreetmap.org'))
    expect(within(retirada).getByRole('link', { name: /Abrir no mapa/ })).toHaveAttribute('target', '_blank')
  })
})
