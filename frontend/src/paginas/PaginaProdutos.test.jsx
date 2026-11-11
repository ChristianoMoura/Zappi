import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { buscarProdutos, excluirProduto } from '../produtos/servicoProdutos'
import { renderizarComRotas } from '../testes/renderizarComRotas'
import { PaginaProdutos } from './PaginaProdutos'

// O backend é simulado aqui para os testes não dependerem da ZAP-39
vi.mock('../produtos/servicoProdutos', async (importarOriginal) => ({
  ...(await importarOriginal()),
  buscarProdutos: vi.fn(),
  excluirProduto: vi.fn(),
}))

const brigadeiro = { id: 1, nome: 'Bolo', sabor: 'Brigadeiro de chocolate', unidade: 'KG', preco: 100, descricao: 'Massa de chocolate.', foto: 'brigadeiro.jpg', textoAlternativo: 'Bolo de brigadeiro coberto com granulado', ativo: true, alergenos: ['GLUTEN', 'LEITE'], outrosAlergenos: 'Canela' }
const coxinha = { id: 4, nome: 'Salgado', sabor: 'Coxinha de frango', unidade: 'UN', preco: 1.2, descricao: '', foto: '', textoAlternativo: '', ativo: true }

async function abrirLista() {
  renderizarComRotas([{ path: '/produtos', Component: PaginaProdutos }], '/produtos')
  return screen.findByRole('heading', { level: 1, name: 'Produtos' })
}

describe('Lista de produtos (ZAP-41, RF05, RF06)', () => {
  beforeEach(() => {
    buscarProdutos.mockReset().mockResolvedValue([brigadeiro, coxinha])
    excluirProduto.mockReset().mockResolvedValue(undefined)
  })

  test('mostra foto com texto alternativo, sabor, preço e unidade (NBR 17225 5.9.1)', async () => {
    await abrirLista()

    expect(screen.getByText('2 produtos no cardápio')).toBeVisible()
    const cartao = screen.getByRole('article', { name: 'Brigadeiro de chocolate' })
    expect(within(cartao).getByRole('img', { name: 'Bolo de brigadeiro coberto com granulado' })).toBeInTheDocument()
    expect(within(cartao).getByText('R$ 100,00')).toBeVisible()
    expect(within(cartao).getByText('por kg')).toBeVisible()
    const semFoto = screen.getByRole('article', { name: 'Coxinha de frango' })
    expect(within(semFoto).getByText('Sem foto')).toBeVisible()
    expect(within(semFoto).getByText('por unidade')).toBeVisible()
    expect(within(semFoto).getByRole('link', { name: 'Editar Salgado de coxinha de frango' })).toHaveAttribute('href', '/produtos/4')
    expect(screen.getByRole('link', { name: 'Cadastrar produto' })).toHaveAttribute('href', '/produtos/novo')
  })

  test('mostra os selos de alérgenos só nos produtos que têm (ZAP-132)', async () => {
    await abrirLista()

    const selos = within(screen.getByRole('article', { name: 'Brigadeiro de chocolate' })).getByRole('list', { name: 'Alérgenos' })
    expect(within(selos).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Contém glúten', 'Leite e derivados', 'Canela'])
    expect(within(screen.getByRole('article', { name: 'Coxinha de frango' })).queryByRole('list', { name: 'Alérgenos' })).not.toBeInTheDocument()
  })

  test('excluir pede confirmação, e "Manter produto" não muda nada', async () => {
    const usuario = userEvent.setup()
    await abrirLista()

    await usuario.click(screen.getByRole('button', { name: 'Excluir Bolo de brigadeiro de chocolate' }))
    const janela = await screen.findByRole('dialog', { name: 'Excluir bolo de brigadeiro de chocolate?' })
    expect(within(janela).getByText(/Os pedidos que já têm este produto continuam como estão/)).toBeVisible()
    await usuario.click(within(janela).getByRole('button', { name: 'Manter produto' }))

    expect(excluirProduto).not.toHaveBeenCalled()
    expect(screen.getByRole('article', { name: 'Brigadeiro de chocolate' })).toBeInTheDocument()
  })

  test('exclui o produto do cardápio depois de confirmar (RN14)', async () => {
    const usuario = userEvent.setup()
    await abrirLista()

    await usuario.click(screen.getByRole('button', { name: 'Excluir Bolo de brigadeiro de chocolate' }))
    const janela = await screen.findByRole('dialog', { name: /Excluir bolo de brigadeiro/ })
    await usuario.click(within(janela).getByRole('button', { name: 'Excluir do cardápio' }))

    expect(excluirProduto).toHaveBeenCalledWith(1)
    expect(await screen.findByText('Bolo de brigadeiro de chocolate saiu do cardápio.')).toBeVisible()
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Brigadeiro de chocolate' })).not.toBeInTheDocument())
    expect(screen.getByText('1 produto no cardápio')).toBeVisible()
  })

  test('avisa quando não consegue excluir e mantém o produto', async () => {
    const usuario = userEvent.setup()
    excluirProduto.mockRejectedValue(new Error('falhou'))
    await abrirLista()

    await usuario.click(screen.getByRole('button', { name: 'Excluir Bolo de brigadeiro de chocolate' }))
    const janela = await screen.findByRole('dialog', { name: /Excluir bolo de brigadeiro/ })
    await usuario.click(within(janela).getByRole('button', { name: 'Excluir do cardápio' }))

    expect(await within(janela).findByRole('alert')).toHaveTextContent('Não foi possível excluir agora')
    expect(screen.getByRole('article', { name: 'Brigadeiro de chocolate' })).toBeInTheDocument()
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
