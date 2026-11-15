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
  categorias: [
    { id: 1, nome: 'Bolos' },
    { id: 2, nome: 'Salgados' },
  ],
  produtos: [
    { id: 1, nome: 'Bolo de brigadeiro de chocolate', categoriaId: 1, categoria: 'Bolos', unidade: 'KG', preco: 100, descricao: 'Massa de chocolate.', foto: '', textoAlternativo: '', alergenos: ['GLUTEN', 'OVOS'], outrosAlergenos: '' },
    { id: 4, nome: 'Coxinha por unidade', categoriaId: 2, categoria: 'Salgados', unidade: 'UN', preco: 1.25, descricao: 'Coxinha de frango.', foto: '', textoAlternativo: '' },
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

  test('no bolo, escolhe a quantidade de 0,5 em 0,5 kg, escreve a observação e adiciona ao pedido', async () => {
    const usuario = userEvent.setup()
    const roteador = abrir('/cardapio/casa-belt/produto/1')

    expect(await screen.findByRole('heading', { level: 1, name: 'Detalhes do produto' })).toBeVisible()
    expect(screen.getByText('Bolos')).toBeVisible()
    expect(screen.getByRole('heading', { level: 2, name: 'Bolo de brigadeiro de chocolate' })).toBeVisible()
    await usuario.click(screen.getByRole('button', { name: 'Aumentar quantidade' }))
    expect(screen.getByText('1,5 kg')).toBeVisible()
    const observacao = screen.getByRole('textbox', { name: 'Observações' })
    expect(observacao).toHaveAccessibleDescription('Algum detalhe? Ex.: tema da festa ou frase no bolo.')
    await usuario.type(observacao, 'Escrever Feliz aniversário')

    const adicionar = screen.getByRole('button', { name: /Adicionar ao pedido/ })
    expect(adicionar).toHaveTextContent('R$ 150,00')
    await usuario.click(adicionar)

    expect(roteador.state.location.pathname).toBe('/cardapio/casa-belt')
    expect(await screen.findByText('Bolo de brigadeiro de chocolate adicionado ao pedido.')).toBeVisible()
    expect(screen.getByRole('link', { name: /Ver pedido · 1 item/ })).toHaveTextContent('R$ 150,00')
    expect(guardado().itens[0]).toMatchObject({ produtoId: 1, quantidade: 1.5, observacao: 'Escrever Feliz aniversário' })
    // Nome, foto e unidade guardados para o item continuar reconhecível se sair do cardápio (ZAP-156)
    expect(guardado().itens[0]).toMatchObject({ nome: 'Bolo de brigadeiro de chocolate', foto: '', unidade: 'KG' })
    expect(guardado().itens[0]).not.toHaveProperty('recheio')
  })

  test('o detalhe mostra os alérgenos e lembra de falar com a loja (ZAP-132)', async () => {
    abrir('/cardapio/casa-belt/produto/1')

    const selos = await screen.findByRole('list', { name: 'Alérgenos' })
    expect(within(selos).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Contém glúten', 'Ovos'])
    expect(screen.getByText(/Tem alergia?/)).toBeVisible()
    expect(screen.getByRole('link', { name: /Fale com a loja pelo WhatsApp/ })).toHaveAttribute('href', expect.stringContaining('wa.me/5511900000000'))
  })

  test('nenhum produto tem recheio nem cobertura; a observação fica em todos (ZAP-140)', async () => {
    abrir('/cardapio/casa-belt/produto/4')

    expect(await screen.findByRole('heading', { level: 2, name: 'Coxinha por unidade' })).toBeVisible()
    expect(screen.queryByRole('textbox', { name: 'Recheio' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Cobertura' })).not.toBeInTheDocument()
    expect(screen.queryByText(/personalizar/i)).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Observações' })).toBeVisible()
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
          { chave: 1, produtoId: 1, quantidade: 1, observacao: '' },
          { chave: 2, produtoId: 4, quantidade: 10, observacao: '' },
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
    expect(texto).toContain('• Bolo de brigadeiro de chocolate — 2 kg (R$ 200,00)')
    expect(texto).toContain('às 15h30')
    expect(guardado()).toMatchObject({ data, hora: '15:30' })
  })

  test('pedido guardado antes da mudança leva o recheio e a cobertura para a observação do item (ZAP-140)', async () => {
    localStorage.setItem(
      'zappi.pedido.casa-belt',
      JSON.stringify({
        itens: [{ chave: 1, produtoId: 1, quantidade: 1, recheio: 'brigadeiro branco', cobertura: 'chantilly', observacao: 'massa branca' }],
        data: '',
        hora: '',
        observacao: '',
      }),
    )
    abrir('/cardapio/casa-belt/pedido')

    const itens = await screen.findByRole('region', { name: 'Itens' })
    expect(within(itens).getByText('Observação: Recheio: brigadeiro branco. Cobertura: chantilly. massa branca')).toBeVisible()
    expect(within(itens).queryByText(/^Recheio:/)).not.toBeInTheDocument()
    expect(guardado().itens[0]).not.toHaveProperty('recheio')
    expect(guardado().itens[0]).not.toHaveProperty('cobertura')
  })

  test('produto que saiu do cardápio continua no pedido, indisponível e fora do total (ZAP-156)', async () => {
    localStorage.setItem(
      'zappi.pedido.casa-belt',
      JSON.stringify({
        itens: [
          { chave: 1, produtoId: 1, quantidade: 1, observacao: '' },
          { chave: 2, produtoId: 9, quantidade: 1.5, observacao: '', nome: 'Bolo de ninho com morango', foto: 'ninho.jpg', unidade: 'KG' },
        ],
        data: '',
        hora: '',
        observacao: '',
      }),
    )
    const usuario = userEvent.setup()
    abrir('/cardapio/casa-belt/pedido')

    const itens = await screen.findByRole('region', { name: 'Itens' })
    expect(within(itens).getByText(/1 item · 1 indisponível/)).toBeVisible()
    const indisponivel = within(itens).getByRole('heading', { level: 3, name: 'Bolo de ninho com morango' }).closest('li')
    expect(within(indisponivel).getByText('Indisponível')).toBeVisible()
    expect(within(indisponivel).getByText('1,5 kg')).toBeVisible()
    expect(within(indisponivel).getByText('Este produto saiu do cardápio. Ele não entra no pedido nem no total.')).toBeVisible()
    expect(within(indisponivel).queryByRole('button', { name: 'Aumentar quantidade' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Total' })).toHaveTextContent('R$ 100,00')

    await usuario.click(within(indisponivel).getByRole('button', { name: 'Remover Bolo de ninho com morango' }))

    expect(screen.getByText('Bolo de ninho com morango removido do pedido.')).toBeVisible()
    expect(guardado().itens.map((item) => item.produtoId)).toEqual([1])
    expect(within(itens).getByText(/^1 item ·/)).toBeVisible()
  })

  test('o item indisponível não vai na mensagem do WhatsApp (ZAP-156)', async () => {
    localStorage.setItem(
      'zappi.pedido.casa-belt',
      JSON.stringify({ itens: [{ chave: 1, produtoId: 1, quantidade: 2 }, { chave: 2, produtoId: 9, quantidade: 1, nome: 'Torta de limão', unidade: 'UN' }], data: dataMinima(), hora: '15:30', observacao: '' }),
    )
    abrir('/cardapio/casa-belt/pedido')

    const enviar = await screen.findByRole('link', { name: /Enviar pelo WhatsApp/ })
    const texto = new URL(enviar.getAttribute('href')).searchParams.get('text')
    expect(texto).toContain('Bolo de brigadeiro de chocolate')
    expect(texto).not.toContain('Torta de limão')
    expect(screen.queryByText(/não vai junto/)).not.toBeInTheDocument()
  })

  test('item guardado antes da mudança, sem o nome, aparece como "Produto indisponível" (ZAP-156)', async () => {
    localStorage.setItem('zappi.pedido.casa-belt', JSON.stringify({ itens: [{ chave: 1, produtoId: 9, quantidade: 1 }], data: '', hora: '', observacao: '' }))
    abrir('/cardapio/casa-belt/pedido')

    expect(await screen.findByRole('heading', { level: 3, name: 'Produto indisponível' })).toBeVisible()
    expect(screen.getByText(/0 itens · 1 indisponível/)).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Seu pedido está vazio' })).not.toBeInTheDocument()
  })
})
