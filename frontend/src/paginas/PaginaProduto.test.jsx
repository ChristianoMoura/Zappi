import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { buscarProduto, buscarProdutos, salvarProduto } from '../produtos/servicoProdutos'
import { renderizarComRotas } from '../testes/renderizarComRotas'
import { PaginaProduto } from './PaginaProduto'
import { PaginaProdutos } from './PaginaProdutos'

// O backend é simulado aqui para os testes não dependerem da ZAP-39 e da ZAP-40
vi.mock('../produtos/servicoProdutos', async (importarOriginal) => ({
  ...(await importarOriginal()),
  buscarProdutos: vi.fn(),
  buscarProduto: vi.fn(),
  salvarProduto: vi.fn(),
}))

const brigadeiro = { id: 1, nome: 'Bolo', sabor: 'Brigadeiro de chocolate', unidade: 'KG', preco: 100, descricao: '', foto: '', textoAlternativo: '', ativo: true }

const rotas = [
  { path: '/produtos', Component: PaginaProdutos },
  { path: '/produtos/novo', Component: PaginaProduto },
  { path: '/produtos/:id', Component: PaginaProduto },
]

const campo = (nome) => screen.getByRole('textbox', { name: nome })

async function abrir(caminho) {
  renderizarComRotas(rotas, caminho)
  return screen.findByRole('heading', { level: 1, name: /Cadastrar produto|Editar/ })
}

describe('Cadastro e edição de produto (ZAP-42, RF05, RF06)', () => {
  beforeEach(() => {
    buscarProduto.mockReset().mockResolvedValue(brigadeiro)
    salvarProduto.mockReset().mockImplementation(async (dados) => ({ id: dados.id ?? 5, ativo: true, ...dados }))
    buscarProdutos.mockReset().mockImplementation(async () => [brigadeiro, { ...brigadeiro, id: 5, nome: 'Salgado', sabor: 'Kibe', unidade: 'UN', preco: 1.5 }])
    URL.createObjectURL = vi.fn(() => 'blob:foto-nova')
  })

  test('abre com o foco no título, o nome "Bolo" e a venda por quilo já escolhidos', async () => {
    const titulo = await abrir('/produtos/novo')

    expect(titulo).toHaveFocus()
    expect(campo(/^Nome/)).toHaveValue('Bolo')
    expect(screen.getByRole('radio', { name: 'Quilo (kg)' })).toBeChecked()
    expect(campo(/^Preço por kg/)).toBeInTheDocument()
  })

  test('o Tab segue a ordem nome, sabor, unidade, preço, descrição, foto e salvar (NBR 17225 5.1.4)', async () => {
    const usuario = userEvent.setup()
    await abrir('/produtos/novo')

    const ordem = [
      campo(/^Nome/),
      campo(/^Sabor/),
      screen.getByRole('radio', { name: 'Quilo (kg)' }),
      campo(/^Preço por kg/),
      campo(/^Descrição/),
      screen.getByRole('button', { name: 'Escolher foto' }),
      screen.getByRole('button', { name: 'Cancelar' }),
      screen.getByRole('button', { name: 'Salvar produto' }),
    ]
    for (const elemento of ordem) {
      await usuario.tab()
      expect(elemento).toHaveFocus()
    }
  })

  test('não salva sem os campos obrigatórios e leva o foco ao primeiro erro', async () => {
    const usuario = userEvent.setup()
    await abrir('/produtos/novo')

    await usuario.click(screen.getByRole('button', { name: 'Salvar produto' }))

    expect(salvarProduto).not.toHaveBeenCalled()
    expect(campo(/^Sabor/)).toHaveFocus()
    expect(campo(/^Sabor/)).toHaveAccessibleDescription(/Escreva o sabor/)
    expect(screen.getByText('Escreva o preço. Ex.: 100,00.')).toBeVisible()
  })

  test('cadastra um salgado vendido por unidade e volta para a lista com o aviso', async () => {
    const usuario = userEvent.setup()
    await abrir('/produtos/novo')

    await usuario.clear(campo(/^Nome/))
    await usuario.type(campo(/^Nome/), 'Salgado')
    await usuario.type(campo(/^Sabor/), 'Kibe')
    await usuario.click(screen.getByRole('radio', { name: 'Unidade' }))
    await usuario.type(campo(/^Preço por unidade/), '1,5')
    await usuario.click(screen.getByRole('button', { name: 'Salvar produto' }))

    expect(salvarProduto).toHaveBeenCalledWith({ nome: 'Salgado', sabor: 'Kibe', unidade: 'UN', preco: 1.5, descricao: '', foto: '', textoAlternativo: '' })
    expect(await screen.findByText('Salgado de kibe entrou no cardápio.')).toBeVisible()
    expect(screen.getByRole('heading', { level: 2, name: 'Kibe' })).toHaveFocus()
  })

  test('com foto, sugere a descrição da foto e não salva sem ela (RN15)', async () => {
    const usuario = userEvent.setup()
    await abrir('/produtos/novo')
    await usuario.type(campo(/^Sabor/), 'Ninho com morango')
    await usuario.type(campo(/^Preço por kg/), '115')

    await usuario.upload(screen.getByTestId('arquivo-foto'), new File(['foto'], 'bolo.jpg', { type: 'image/jpeg' }))

    const descricaoFoto = campo(/^Descrição da foto/)
    expect(descricaoFoto).toHaveValue('Bolo de ninho com morango')
    await usuario.clear(descricaoFoto)
    await usuario.click(screen.getByRole('button', { name: 'Salvar produto' }))
    expect(salvarProduto).not.toHaveBeenCalled()
    expect(descricaoFoto).toHaveFocus()

    await usuario.type(descricaoFoto, 'Bolo branco com morangos')
    await usuario.click(screen.getByRole('button', { name: 'Salvar produto' }))
    expect(salvarProduto).toHaveBeenCalledWith(expect.objectContaining({ foto: 'blob:foto-nova', textoAlternativo: 'Bolo branco com morangos', preco: 115 }))
  })

  test('recusa foto em formato que não é JPG, PNG ou WebP', async () => {
    const usuario = userEvent.setup({ applyAccept: false })
    await abrir('/produtos/novo')

    await usuario.upload(screen.getByTestId('arquivo-foto'), new File(['foto'], 'bolo.gif', { type: 'image/gif' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Use uma foto em JPG, PNG ou WebP.')
    expect(screen.queryByRole('textbox', { name: /^Descrição da foto/ })).not.toBeInTheDocument()
  })

  test('ao editar o preço, avisa que os pedidos antigos mantêm o preço da época (RN10)', async () => {
    const usuario = userEvent.setup()
    const titulo = await abrir('/produtos/1')

    expect(titulo).toHaveTextContent('Editar Bolo de brigadeiro de chocolate')
    const preco = campo(/^Preço por kg/)
    expect(preco).toHaveValue('100,00')
    await usuario.clear(preco)
    await usuario.type(preco, '110')

    expect(screen.getByText(/Os pedidos já feitos continuam com R\$ 100,00/)).toBeVisible()
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect(salvarProduto).toHaveBeenCalledWith(expect.objectContaining({ id: 1, preco: 110 }))
    expect(await screen.findByText('Alterações salvas.')).toBeVisible()
  })

  test('cancelar volta para a lista sem salvar', async () => {
    const usuario = userEvent.setup()
    await abrir('/produtos/1')

    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Produtos' })).toBeVisible()
    expect(salvarProduto).not.toHaveBeenCalled()
    expect(within(screen.getByRole('article', { name: 'Brigadeiro de chocolate' })).getByRole('heading')).toHaveFocus()
  })
})
