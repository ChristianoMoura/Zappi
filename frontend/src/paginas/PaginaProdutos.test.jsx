import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { buscarProdutos, excluirProduto, tirarDoCardapio, voltarAoCardapio } from '../produtos/servicoProdutos'
import { renderizarComRotas } from '../testes/renderizarComRotas'
import { PaginaProdutos } from './PaginaProdutos'

// O backend é simulado aqui para os testes não dependerem da ZAP-39
vi.mock('../produtos/servicoProdutos', async (importarOriginal) => ({
  ...(await importarOriginal()),
  buscarProdutos: vi.fn(),
  excluirProduto: vi.fn(),
  tirarDoCardapio: vi.fn(),
  voltarAoCardapio: vi.fn(),
}))

const bolos = { id: 1, nome: 'Bolos' }
const salgados = { id: 2, nome: 'Salgados' }
const brigadeiro = { id: 1, nome: 'Bolo de brigadeiro de chocolate', categoria: bolos, unidade: 'KG', preco: 100, descricao: 'Massa de chocolate.', foto: 'brigadeiro.jpg', textoAlternativo: 'Bolo de brigadeiro coberto com granulado', ativo: true, alergenos: ['GLUTEN', 'LEITE'], outrosAlergenos: 'Canela' }
const coxinha = { id: 4, nome: 'Coxinha de frango', categoria: salgados, unidade: 'UN', preco: 1.2, descricao: '', foto: '', textoAlternativo: '', ativo: true }

async function abrirLista() {
  renderizarComRotas([{ path: '/produtos', Component: PaginaProdutos }], '/produtos')
  return screen.findByRole('heading', { level: 1, name: 'Produtos' })
}

describe('Lista de produtos (ZAP-41, RF05, RF06)', () => {
  beforeEach(() => {
    buscarProdutos.mockReset().mockResolvedValue([brigadeiro, coxinha])
    excluirProduto.mockReset().mockResolvedValue(undefined)
    tirarDoCardapio.mockReset().mockImplementation(async (id) => ({ ...[brigadeiro, coxinha].find((p) => p.id === id), noCardapio: false }))
    voltarAoCardapio.mockReset().mockImplementation(async (id) => ({ ...[brigadeiro, coxinha].find((p) => p.id === id), noCardapio: true }))
  })

  test('mostra uma seção por categoria, na ordem da API, e o botão Categorias (ZAP-139)', async () => {
    await abrirLista()

    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Bolos 1 produto', 'Salgados 1 produto'])
    const secaoBolos = screen.getByRole('region', { name: /Bolos/ })
    expect(within(secaoBolos).getByRole('heading', { level: 3, name: 'Bolo de brigadeiro de chocolate' })).toBeInTheDocument()
    expect(within(secaoBolos).queryByRole('article', { name: 'Coxinha de frango' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Categorias' })).toHaveAttribute('href', '/categorias')
  })

  test('mostra foto com texto alternativo, nome, preço e unidade (NBR 17225 5.9.1)', async () => {
    await abrirLista()

    // Sem a frase de contagem no topo (ZAP-155)
    expect(screen.queryByText(/no cardápio, em/)).not.toBeInTheDocument()
    const cartao = screen.getByRole('article', { name: 'Bolo de brigadeiro de chocolate' })
    expect(within(cartao).getByRole('img', { name: 'Bolo de brigadeiro coberto com granulado' })).toBeInTheDocument()
    expect(within(cartao).getByText('R$ 100,00')).toBeVisible()
    expect(within(cartao).getByText('por kg')).toBeVisible()
    const semFoto = screen.getByRole('article', { name: 'Coxinha de frango' })
    expect(within(semFoto).getByText('Sem foto')).toBeVisible()
    expect(within(semFoto).getByText('por unidade')).toBeVisible()
    expect(within(semFoto).getByRole('link', { name: 'Editar Coxinha de frango' })).toHaveAttribute('href', '/produtos/4')
    expect(screen.getByRole('link', { name: 'Cadastrar produto' })).toHaveAttribute('href', '/produtos/novo')
  })

  test('o cartão não mostra os alérgenos; eles ficam no detalhe do produto', async () => {
    await abrirLista()

    expect(within(screen.getByRole('article', { name: 'Bolo de brigadeiro de chocolate' })).queryByRole('list', { name: 'Alérgenos' })).not.toBeInTheDocument()
    expect(screen.queryByText('Contém glúten')).not.toBeInTheDocument()
  })

  test('excluir pede confirmação, e "Manter produto" não muda nada', async () => {
    const usuario = userEvent.setup()
    await abrirLista()

    await usuario.click(screen.getByRole('button', { name: 'Excluir Bolo de brigadeiro de chocolate' }))
    const janela = await screen.findByRole('dialog', { name: 'Excluir Bolo de brigadeiro de chocolate?' })
    expect(within(janela).getByText(/Os pedidos que já têm este produto continuam como estão/)).toBeVisible()
    await usuario.click(within(janela).getByRole('button', { name: 'Manter produto' }))

    expect(excluirProduto).not.toHaveBeenCalled()
    expect(screen.getByRole('article', { name: 'Bolo de brigadeiro de chocolate' })).toBeInTheDocument()
  })

  test('exclui o produto do cardápio depois de confirmar (RN14)', async () => {
    const usuario = userEvent.setup()
    await abrirLista()

    await usuario.click(screen.getByRole('button', { name: 'Excluir Bolo de brigadeiro de chocolate' }))
    const janela = await screen.findByRole('dialog', { name: /Excluir Bolo de brigadeiro/ })
    expect(within(janela).getByText(/Se for só por um tempo, use "Tirar do cardápio"/)).toBeVisible()
    await usuario.click(within(janela).getByRole('button', { name: 'Excluir produto' }))

    expect(excluirProduto).toHaveBeenCalledWith(1)
    expect(await screen.findByText('Bolo de brigadeiro de chocolate foi excluído.')).toBeVisible()
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Bolo de brigadeiro de chocolate' })).not.toBeInTheDocument())
  })

  test('avisa quando não consegue excluir e mantém o produto', async () => {
    const usuario = userEvent.setup()
    excluirProduto.mockRejectedValue(new Error('falhou'))
    await abrirLista()

    await usuario.click(screen.getByRole('button', { name: 'Excluir Bolo de brigadeiro de chocolate' }))
    const janela = await screen.findByRole('dialog', { name: /Excluir Bolo de brigadeiro/ })
    await usuario.click(within(janela).getByRole('button', { name: 'Excluir produto' }))

    expect(await within(janela).findByRole('alert')).toHaveTextContent('Não foi possível excluir agora')
    expect(screen.getByRole('article', { name: 'Bolo de brigadeiro de chocolate' })).toBeInTheDocument()
  })

  test('tirar do cardápio pede confirmação, com o foco em "Manter no cardápio", e o produto continua na lista (ZAP-155)', async () => {
    const usuario = userEvent.setup()
    await abrirLista()

    await usuario.click(screen.getByRole('button', { name: 'Tirar Bolo de brigadeiro de chocolate do cardápio' }))
    const janela = await screen.findByRole('dialog', { name: 'Tirar Bolo de brigadeiro de chocolate do cardápio?' })
    expect(within(janela).getByText('O produto some do cardápio, mas continua aqui. Você pode voltar com ele quando quiser.')).toBeVisible()
    await waitFor(() => expect(within(janela).getByRole('button', { name: 'Manter no cardápio' })).toHaveFocus())
    await usuario.click(within(janela).getByRole('button', { name: 'Tirar do cardápio' }))

    expect(tirarDoCardapio).toHaveBeenCalledWith(1)
    expect(await screen.findByText('Bolo de brigadeiro de chocolate saiu do cardápio. Ele continua aqui.')).toBeVisible()
    const cartao = screen.getByRole('article', { name: /Bolo de brigadeiro de chocolate/ })
    expect(within(cartao).getByText('Fora do cardápio')).toBeVisible()
    expect(within(cartao).getByRole('button', { name: 'Voltar Bolo de brigadeiro de chocolate ao cardápio' })).toBeVisible()
  })

  test('"Manter no cardápio" fecha sem mudar nada', async () => {
    const usuario = userEvent.setup()
    await abrirLista()

    await usuario.click(screen.getByRole('button', { name: 'Tirar Coxinha de frango do cardápio' }))
    await usuario.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Manter no cardápio' }))

    expect(tirarDoCardapio).not.toHaveBeenCalled()
    expect(within(screen.getByRole('article', { name: 'Coxinha de frango' })).queryByText('Fora do cardápio')).not.toBeInTheDocument()
  })

  test('produto fora do cardápio volta com um clique, sem confirmação (ZAP-155)', async () => {
    buscarProdutos.mockResolvedValue([brigadeiro, { ...coxinha, noCardapio: false }])
    const usuario = userEvent.setup()
    await abrirLista()

    const cartao = screen.getByRole('article', { name: 'Coxinha de frango' })
    expect(within(cartao).getByText('Fora do cardápio')).toBeVisible()
    expect(within(cartao).queryByRole('button', { name: /Tirar/ })).not.toBeInTheDocument()
    await usuario.click(within(cartao).getByRole('button', { name: 'Voltar Coxinha de frango ao cardápio' }))

    expect(voltarAoCardapio).toHaveBeenCalledWith(4)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByText('Coxinha de frango voltou ao cardápio.')).toBeVisible()
    expect(within(cartao).queryByText('Fora do cardápio')).not.toBeInTheDocument()
    await waitFor(() => expect(within(cartao).getByRole('button', { name: 'Tirar Coxinha de frango do cardápio' })).toHaveFocus())
  })

  test('cardápio vazio mostra como começar', async () => {
    buscarProdutos.mockResolvedValue([])
    await abrirLista()

    expect(screen.getByRole('heading', { name: 'Seu cardápio está vazio' })).toBeVisible()
  })

  test('avisa quando não consegue carregar', async () => {
    buscarProdutos.mockRejectedValue(new Error('falhou'))
    renderizarComRotas([{ path: '/produtos', Component: PaginaProdutos }], '/produtos')

    expect(await screen.findByText(/Não foi possível carregar os produtos agora/)).toBeVisible()
  })
})
