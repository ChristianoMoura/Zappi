import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { dataMinima } from '../cardapio/regrasPedidoCliente'
import { buscarCardapio } from '../cardapio/servicoCardapio'
import { renderizarComRotas } from '../testes/renderizarComRotas'
import { PaginaCardapio } from './PaginaCardapio'

// O backend é simulado aqui; as chamadas à rota pública (ZAP-104) são testadas no servicoCardapio.test.js
vi.mock('../cardapio/servicoCardapio', async (importarOriginal) => ({
  ...(await importarOriginal()),
  buscarCardapio: vi.fn(),
}))

const CARDAPIO = {
  estabelecimento: { nome: 'Casa Belt', slug: 'casa-belt', descricao: '', whatsapp: '5511900000000', logo: '', capa: '' },
  produtos: [
    { id: 1, nome: 'Bolo', sabor: 'Brigadeiro de chocolate', unidade: 'KG', preco: 100, descricao: 'Massa de chocolate.', foto: '', textoAlternativo: '' },
    { id: 4, nome: 'Salgado', sabor: 'Coxinha por unidade', unidade: 'UN', preco: 1.25, descricao: 'Coxinha de frango.', foto: '', textoAlternativo: '' },
  ],
}

function abrir(caminho) {
  return renderizarComRotas([{ path: '/cardapio/:slug/*', Component: PaginaCardapio }], caminho)
}

const guardado = () => JSON.parse(localStorage.getItem('zappi.pedido.casa-belt'))

describe('montagem do pedido no cardápio público (ZAP-107)', () => {
  beforeEach(() => {
    buscarCardapio.mockResolvedValue(structuredClone(CARDAPIO))
    window.scrollTo = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  test('no bolo, escolhe a quantidade de 0,5 em 0,5 kg, personaliza e adiciona ao pedido', async () => {
    const usuario = userEvent.setup()
    const roteador = abrir('/cardapio/casa-belt/produto/1')

    expect(await screen.findByRole('heading', { level: 1, name: 'Detalhes do produto' })).toBeVisible()
    expect(screen.getByText(/Quer outra massa\? Escreva aqui/)).toBeVisible()
    await usuario.click(screen.getByRole('button', { name: 'Aumentar quantidade' }))
    expect(screen.getByText('1,5 kg')).toBeVisible()
    await usuario.type(screen.getByRole('textbox', { name: 'Recheio' }), 'brigadeiro branco')

    const adicionar = screen.getByRole('button', { name: /Adicionar ao pedido/ })
    expect(adicionar).toHaveTextContent('R$ 150,00')
    await usuario.click(adicionar)

    expect(roteador.state.location.pathname).toBe('/cardapio/casa-belt')
    expect(await screen.findByText('Brigadeiro de chocolate adicionado ao pedido.')).toBeVisible()
    expect(screen.getByRole('link', { name: /Ver pedido · 1 item/ })).toHaveTextContent('R$ 150,00')
    expect(guardado().itens[0]).toMatchObject({ produtoId: 1, quantidade: 1.5, recheio: 'brigadeiro branco' })
  })

  test('produto por unidade não tem recheio nem cobertura', async () => {
    abrir('/cardapio/casa-belt/produto/4')

    expect(await screen.findByRole('heading', { level: 2, name: 'Coxinha por unidade' })).toBeVisible()
    expect(screen.queryByRole('textbox', { name: 'Recheio' })).not.toBeInTheDocument()
    expect(screen.getByText('1 unidade')).toBeVisible()
  })

  test('produto que não existe mostra uma mensagem clara', async () => {
    abrir('/cardapio/casa-belt/produto/99')

    expect(await screen.findByRole('heading', { name: 'Produto não encontrado' })).toBeVisible()
  })

  test('pedido vazio convida a ver o cardápio', async () => {
    abrir('/cardapio/casa-belt/pedido')

    expect(await screen.findByRole('heading', { name: 'Seu pedido está vazio' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Ver o cardápio' })).toHaveAttribute('href', '/cardapio/casa-belt')
  })

  test('no "Seu pedido", altera a quantidade, remove itens e o total acompanha', async () => {
    localStorage.setItem(
      'zappi.pedido.casa-belt',
      JSON.stringify({
        itens: [
          { chave: 1, produtoId: 1, quantidade: 1, recheio: '', cobertura: '', observacao: '' },
          { chave: 2, produtoId: 4, quantidade: 10, recheio: '', cobertura: '', observacao: '' },
        ],
        data: '',
        hora: '',
        observacao: '',
      }),
    )
    const usuario = userEvent.setup()
    abrir('/cardapio/casa-belt/pedido')

    const total = await screen.findByRole('region', { name: 'Total' })
    expect(total).toHaveTextContent('R$ 112,50')

    const itens = screen.getByRole('region', { name: 'Itens' })
    await usuario.click(within(itens).getAllByRole('button', { name: 'Aumentar quantidade' })[0])
    expect(total).toHaveTextContent('R$ 162,50')

    await usuario.click(within(itens).getByRole('button', { name: /Remover Coxinha por unidade/ }))
    expect(total).toHaveTextContent('R$ 150,00')
    expect(screen.getByText('Coxinha por unidade removido do pedido.')).toBeVisible()
    expect(guardado().itens).toHaveLength(1)
  })

  test('sem data e hora não envia: mostra o erro junto do campo e leva o foco para ele', async () => {
    localStorage.setItem(
      'zappi.pedido.casa-belt',
      JSON.stringify({ itens: [{ chave: 1, produtoId: 1, quantidade: 1 }], data: '', hora: '', observacao: '' }),
    )
    const usuario = userEvent.setup()
    abrir('/cardapio/casa-belt/pedido')

    await usuario.click(await screen.findByRole('link', { name: /Enviar pelo WhatsApp/ }))

    expect(screen.getByText('Escolha a data de retirada.')).toBeVisible()
    expect(screen.getByText('Escolha a hora de retirada.')).toBeVisible()
    expect(screen.getByLabelText('Data')).toHaveFocus()
    expect(screen.getByRole('link', { name: /Fale com a loja pelo WhatsApp/ })).toHaveAttribute('href', expect.stringContaining('wa.me/5511900000000'))
  })

  test('com data e hora, o botão leva o pedido pronto para o WhatsApp da loja', async () => {
    const data = dataMinima()
    localStorage.setItem(
      'zappi.pedido.casa-belt',
      JSON.stringify({ itens: [{ chave: 1, produtoId: 1, quantidade: 2 }], data, hora: '', observacao: '' }),
    )
    const usuario = userEvent.setup()
    abrir('/cardapio/casa-belt/pedido')

    await usuario.selectOptions(await screen.findByLabelText('Hora'), '15:30')

    expect(screen.getByText(/às 15h30/)).toBeVisible()
    const enviar = screen.getByRole('link', { name: /Enviar pelo WhatsApp/ })
    const texto = new URL(enviar.getAttribute('href')).searchParams.get('text')
    expect(texto).toContain('• Brigadeiro de chocolate — 2 kg (R$ 200,00)')
    expect(texto).toContain('às 15h30')
    expect(guardado()).toMatchObject({ data, hora: '15:30' })
  })
})
