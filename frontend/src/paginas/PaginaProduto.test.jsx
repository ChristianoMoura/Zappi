import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { buscarCategorias } from '../categorias/servicoCategorias'
import { ALERGENOS } from '../produtos/regrasProdutos'
import { buscarProduto, buscarProdutos, salvarProduto, tirarDoCardapio, voltarAoCardapio } from '../produtos/servicoProdutos'
import { renderizarComRotas } from '../testes/renderizarComRotas'
import { PaginaProduto } from './PaginaProduto'
import { PaginaProdutos } from './PaginaProdutos'

// O backend é simulado aqui para os testes não dependerem da ZAP-39 e da ZAP-40
vi.mock('../produtos/servicoProdutos', async (importarOriginal) => ({
  ...(await importarOriginal()),
  buscarProdutos: vi.fn(),
  buscarProduto: vi.fn(),
  salvarProduto: vi.fn(),
  tirarDoCardapio: vi.fn(),
  voltarAoCardapio: vi.fn(),
}))
vi.mock('../categorias/servicoCategorias', async (importarOriginal) => ({ ...(await importarOriginal()), buscarCategorias: vi.fn() }))

const bolos = { id: 1, nome: 'Bolos' }
const salgados = { id: 2, nome: 'Salgados' }

const brigadeiro = { id: 1, nome: 'Bolo de brigadeiro de chocolate', categoria: bolos, unidade: 'KG', preco: 100, descricao: '', foto: '', textoAlternativo: '', ativo: true }

const rotas = [
  { path: '/produtos', Component: PaginaProdutos },
  { path: '/produtos/novo', Component: PaginaProduto },
  { path: '/produtos/:id', Component: PaginaProduto },
]

const campo = (nome) => screen.getByRole('textbox', { name: nome })
const categoria = () => screen.getByRole('combobox', { name: /^Categoria/ })

async function abrir(caminho) {
  renderizarComRotas(rotas, caminho)
  return screen.findByRole('heading', { level: 1, name: /Cadastrar produto|Editar/ })
}

describe('Cadastro e edição de produto (ZAP-42, RF05, RF06)', () => {
  beforeEach(() => {
    buscarProduto.mockReset().mockResolvedValue(brigadeiro)
    salvarProduto.mockReset().mockImplementation(async (dados) => ({ id: dados.id ?? 5, ativo: true, ...dados }))
    buscarCategorias.mockReset().mockResolvedValue([bolos, salgados])
    buscarProdutos.mockReset().mockImplementation(async () => [brigadeiro, { ...brigadeiro, id: 5, nome: 'Kibe', categoria: salgados, unidade: 'UN', preco: 1.5 }])
    URL.createObjectURL = vi.fn(() => 'blob:foto-nova')
  })

  test('abre com o foco no título, sem o campo sabor e com a venda por quilo já escolhida (ZAP-139)', async () => {
    const titulo = await abrir('/produtos/novo')

    expect(titulo).toHaveFocus()
    expect(campo(/^Nome/)).toHaveValue('')
    expect(screen.queryByRole('textbox', { name: /^Sabor/ })).not.toBeInTheDocument()
    expect(categoria()).toHaveValue('')
    expect(within(categoria()).getAllByRole('option').map((o) => o.textContent)).toEqual(['Escolha a categoria', 'Bolos', 'Salgados'])
    expect(screen.getByRole('radio', { name: 'Quilo (kg)' })).toBeChecked()
    expect(campo(/^Preço por kg/)).toBeInTheDocument()
  })

  test('o Tab segue a ordem nome, categoria, unidade, preço, descrição, foto e salvar (NBR 17225 5.1.4)', async () => {
    const usuario = userEvent.setup()
    await abrir('/produtos/novo')

    const ordem = [
      campo(/^Nome/),
      categoria(),
      screen.getByRole('radio', { name: 'Quilo (kg)' }),
      campo(/^Preço por kg/),
      campo(/^Descrição/),
      ...ALERGENOS.map((a) => screen.getByRole('checkbox', { name: a.nome })),
      campo(/^Outros alérgenos/),
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
    expect(campo(/^Nome/)).toHaveFocus()
    expect(campo(/^Nome/)).toHaveAccessibleDescription(/Escreva o nome do produto/)
    expect(screen.getByText('Escolha a categoria do produto.')).toBeVisible()
    expect(screen.getByText('Escreva o preço. Ex.: 100,00.')).toBeVisible()
  })

  test('cadastra um salgado vendido por unidade e volta para a lista com o aviso', async () => {
    const usuario = userEvent.setup()
    await abrir('/produtos/novo')

    await usuario.type(campo(/^Nome/), 'Kibe')
    await usuario.selectOptions(categoria(), '2')
    await usuario.click(screen.getByRole('radio', { name: 'Unidade' }))
    await usuario.type(campo(/^Preço por unidade/), '1,5')
    await usuario.click(screen.getByRole('button', { name: 'Salvar produto' }))

    expect(salvarProduto).toHaveBeenCalledWith({ nome: 'Kibe', categoriaId: '2', unidade: 'UN', preco: 1.5, descricao: '', foto: '', textoAlternativo: '', alergenos: [], outrosAlergenos: '' })
    expect(await screen.findByText('Kibe entrou no cardápio.')).toBeVisible()
    expect(screen.getByRole('heading', { level: 3, name: 'Kibe' })).toHaveFocus()
  })

  test('marca os alérgenos e escreve os que não estão na lista (ZAP-132)', async () => {
    const usuario = userEvent.setup()
    await abrir('/produtos/1')

    const alergenos = screen.getByRole('group', { name: /Alérgenos/ })
    expect(within(alergenos).getAllByRole('checkbox')).toHaveLength(7)
    await usuario.click(screen.getByRole('checkbox', { name: 'Ovos' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Glúten' }))
    await usuario.type(campo(/^Outros alérgenos/), ' Canela ')
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(salvarProduto).toHaveBeenCalledWith(expect.objectContaining({ alergenos: ['OVOS', 'GLUTEN'], outrosAlergenos: 'Canela' }))
  })

  test('ao editar, mostra os alérgenos já marcados', async () => {
    buscarProduto.mockResolvedValue({ ...brigadeiro, alergenos: ['LEITE'], outrosAlergenos: 'Canela' })
    await abrir('/produtos/1')

    expect(screen.getByRole('checkbox', { name: 'Leite e derivados' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Glúten' })).not.toBeChecked()
    expect(campo(/^Outros alérgenos/)).toHaveValue('Canela')
  })

  test('com foto, sugere a descrição da foto e não salva sem ela (RN15)', async () => {
    const usuario = userEvent.setup()
    await abrir('/produtos/novo')
    await usuario.type(campo(/^Nome/), 'Bolo de ninho com morango')
    await usuario.selectOptions(categoria(), '1')
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

  test('ao editar, a categoria do produto já vem escolhida', async () => {
    await abrir('/produtos/1')

    expect(categoria()).toHaveValue('1')
    expect(campo(/^Nome/)).toHaveValue('Bolo de brigadeiro de chocolate')
  })

  test('sem categoria cadastrada, mostra o caminho para criar a primeira', async () => {
    buscarCategorias.mockResolvedValue([])
    await abrir('/produtos/novo')

    expect(screen.queryByRole('combobox', { name: /^Categoria/ })).not.toBeInTheDocument()
    expect(screen.getByText(/Você ainda não tem categorias/)).toBeVisible()
    expect(screen.getByRole('link', { name: 'Criar a primeira categoria' })).toHaveAttribute('href', '/categorias')
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

  test('ao editar, mostra se o produto está no cardápio e tira depois de confirmar, sem salvar o formulário (ZAP-155)', async () => {
    tirarDoCardapio.mockReset().mockResolvedValue({ ...brigadeiro, noCardapio: false })
    const usuario = userEvent.setup()
    await abrir('/produtos/1')

    expect(screen.getByText('No cardápio')).toBeVisible()
    await usuario.click(screen.getByRole('button', { name: 'Tirar do cardápio' }))
    const janela = await screen.findByRole('dialog', { name: 'Tirar Bolo de brigadeiro de chocolate do cardápio?' })
    await usuario.click(within(janela).getByRole('button', { name: 'Tirar do cardápio' }))

    expect(tirarDoCardapio).toHaveBeenCalledWith(1)
    expect(await screen.findByText('Fora do cardápio')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Voltar ao cardápio' })).toBeVisible()
    expect(salvarProduto).not.toHaveBeenCalled()
  })

  test('produto fora do cardápio volta com um clique na tela do produto (ZAP-155)', async () => {
    buscarProduto.mockResolvedValue({ ...brigadeiro, noCardapio: false })
    voltarAoCardapio.mockReset().mockResolvedValue({ ...brigadeiro, noCardapio: true })
    const usuario = userEvent.setup()
    await abrir('/produtos/1')

    expect(screen.getByText('Fora do cardápio')).toBeVisible()
    await usuario.click(screen.getByRole('button', { name: 'Voltar ao cardápio' }))

    expect(voltarAoCardapio).toHaveBeenCalledWith(1)
    expect(await screen.findByText('No cardápio')).toBeVisible()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('ao cadastrar, não mostra se o produto está no cardápio: ele entra no cardápio', async () => {
    await abrir('/produtos/novo')

    expect(screen.queryByText('No cardápio')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tirar do cardápio' })).not.toBeInTheDocument()
  })

  test('cancelar volta para a lista sem salvar', async () => {
    const usuario = userEvent.setup()
    await abrir('/produtos/1')

    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Produtos' })).toBeVisible()
    expect(salvarProduto).not.toHaveBeenCalled()
    expect(within(screen.getByRole('article', { name: 'Bolo de brigadeiro de chocolate' })).getByRole('heading')).toHaveFocus()
  })
})
