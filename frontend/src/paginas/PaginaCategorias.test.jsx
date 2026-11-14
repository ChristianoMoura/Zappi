import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { buscarCategorias, CategoriaRecusadaError, excluirCategoria, reordenarCategorias, salvarCategoria } from '../categorias/servicoCategorias'
import { buscarProdutos } from '../produtos/servicoProdutos'
import { renderizarComRotas } from '../testes/renderizarComRotas'
import { PaginaCategorias } from './PaginaCategorias'

// O backend é simulado aqui; as chamadas às rotas ficam no servicoCategorias.test.js
vi.mock('../categorias/servicoCategorias', async (importarOriginal) => ({
  ...(await importarOriginal()),
  buscarCategorias: vi.fn(),
  salvarCategoria: vi.fn(),
  reordenarCategorias: vi.fn(),
  excluirCategoria: vi.fn(),
}))
vi.mock('../produtos/servicoProdutos', async (importarOriginal) => ({ ...(await importarOriginal()), buscarProdutos: vi.fn() }))

const bolos = { id: 1, nome: 'Bolos', aceitaRecheioCobertura: true }
const salgados = { id: 2, nome: 'Salgados', aceitaRecheioCobertura: false }
const doces = { id: 3, nome: 'Doces finos', aceitaRecheioCobertura: false }

const nomes = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
const anuncio = () => screen.getAllByRole('status').find((s) => s.getAttribute('aria-live') === 'polite')

// O jsdom não tem PointerEvent: o arraste usa o mesmo formato do MouseEvent
beforeAll(() => {
  if (!window.PointerEvent) window.PointerEvent = class extends MouseEvent {}
})

async function abrir() {
  renderizarComRotas([{ path: '/categorias', Component: PaginaCategorias }, { path: '/produtos', element: <h1>Produtos</h1> }], '/categorias')
  return screen.findByRole('heading', { level: 1, name: 'Categorias' })
}

describe('Categorias do cardápio (ZAP-139, US3, RF05)', () => {
  beforeEach(() => {
    buscarCategorias.mockReset().mockResolvedValue([bolos, salgados, doces])
    buscarProdutos.mockReset().mockResolvedValue([
      { id: 10, nome: 'Bolo de brigadeiro de chocolate', categoria: bolos },
      { id: 11, nome: 'Bolo de ninho com morango', categoria: bolos },
      { id: 12, nome: 'Cento de coxinha', categoria: salgados },
    ])
    reordenarCategorias.mockReset().mockImplementation(async (ids) => ids.map((id) => [bolos, salgados, doces].find((c) => c.id === id)))
    salvarCategoria.mockReset().mockImplementation(async (dados) => ({ id: dados.id ?? 9, nome: dados.nome, aceitaRecheioCobertura: dados.aceitaRecheioCobertura }))
    excluirCategoria.mockReset().mockResolvedValue(undefined)
  })

  test('lista as categorias na ordem da Lídia, com os produtos e o recheio de cada uma', async () => {
    const titulo = await abrir()

    expect(titulo).toHaveFocus()
    expect(nomes()).toEqual(['Bolos', 'Salgados', 'Doces finos'])
    const primeira = screen.getByRole('listitem', { name: 'Bolos' })
    expect(within(primeira).getByText('2 produtos')).toBeVisible()
    expect(within(primeira).getByText(/Aceita recheio e cobertura/)).toBeVisible()
    expect(within(screen.getByRole('listitem', { name: 'Doces finos' })).getByText('0 produtos')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Mover Bolos, posição 1 de 3' })).toHaveAccessibleDescription(/Espaço para pegar/)
  })

  test('pelo teclado, Espaço pega, as setas movem e Espaço solta, com cada passo anunciado (NBR 17225 5.1.4)', async () => {
    const usuario = userEvent.setup()
    await abrir()
    const alca = screen.getByRole('button', { name: /Mover Doces finos/ })
    alca.focus()

    await usuario.keyboard(' ')
    expect(alca).toHaveAttribute('aria-pressed', 'true')
    expect(anuncio()).toHaveTextContent('Doces finos pega, posição 3 de 3.')
    await usuario.keyboard('{ArrowUp}')
    expect(anuncio()).toHaveTextContent('Doces finos, posição 2 de 3.')
    await usuario.keyboard('{ArrowUp}{ArrowUp}')
    expect(anuncio()).toHaveTextContent('Doces finos já está na 1ª posição.')
    expect(nomes()).toEqual(['Doces finos', 'Bolos', 'Salgados'])
    expect(screen.getByRole('button', { name: /Mover Doces finos/ })).toHaveFocus()

    await usuario.keyboard(' ')
    expect(reordenarCategorias).toHaveBeenCalledWith([3, 1, 2])
    expect(anuncio()).toHaveTextContent('Doces finos solta na posição 1 de 3.')
    expect(screen.getByRole('button', { name: /Mover Doces finos/ })).toHaveFocus()
  })

  test('Esc desfaz o movimento sem gravar', async () => {
    const usuario = userEvent.setup()
    await abrir()
    screen.getByRole('button', { name: /Mover Bolos/ }).focus()

    await usuario.keyboard(' {ArrowDown}{ArrowDown}{Escape}')

    expect(nomes()).toEqual(['Bolos', 'Salgados', 'Doces finos'])
    expect(anuncio()).toHaveTextContent('Movimento desfeito. Bolos voltou para a posição 1.')
    expect(reordenarCategorias).not.toHaveBeenCalled()
  })

  test('com o mouse ou o dedo, arrasta a categoria pela alça para a nova posição', async () => {
    await abrir()
    // Cada categoria ocupa 100 px de altura, uma embaixo da outra
    screen.getAllByRole('listitem').forEach((item, i) => {
      item.getBoundingClientRect = () => ({ top: i * 100, height: 100, bottom: i * 100 + 100 })
    })
    const alca = screen.getByRole('button', { name: /Mover Doces finos/ })

    fireEvent.pointerDown(alca, { clientY: 250, button: 0 })
    fireEvent.pointerMove(window, { clientY: 240 })
    fireEvent.pointerMove(window, { clientY: 20 })
    expect(nomes()).toEqual(['Doces finos', 'Bolos', 'Salgados'])
    await act(async () => fireEvent.pointerUp(window, { clientY: 20 }))

    expect(reordenarCategorias).toHaveBeenCalledWith([3, 1, 2])
    expect(anuncio()).toHaveTextContent('Doces finos solta na posição 1 de 3.')
    expect(screen.getByRole('button', { name: /Mover Doces finos/ })).toHaveFocus()
  })

  test('se não conseguir gravar a nova ordem, volta a lista como estava e avisa', async () => {
    const usuario = userEvent.setup()
    reordenarCategorias.mockRejectedValue(new Error('falhou'))
    await abrir()
    screen.getByRole('button', { name: /Mover Salgados/ }).focus()

    await usuario.keyboard(' {ArrowUp} ')

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar a nova ordem')
    expect(nomes()).toEqual(['Bolos', 'Salgados', 'Doces finos'])
  })

  test('cria uma categoria no fim da lista, com recheio e cobertura, e não aceita nome repetido', async () => {
    const usuario = userEvent.setup()
    await abrir()

    await usuario.click(screen.getByRole('button', { name: 'Nova categoria' }))
    const janela = await screen.findByRole('dialog', { name: 'Nova categoria' })
    const nome = within(janela).getByRole('textbox', { name: 'Nome da categoria' })
    expect(nome).toHaveFocus()
    await usuario.type(nome, ' bolos ')
    await usuario.click(within(janela).getByRole('button', { name: 'Salvar categoria' }))
    expect(within(janela).getByText('Já existe a categoria "bolos".')).toBeVisible()
    expect(salvarCategoria).not.toHaveBeenCalled()

    await usuario.clear(nome)
    await usuario.type(nome, 'Tortas')
    await usuario.click(within(janela).getByRole('checkbox', { name: /aceitam recheio e cobertura/ }))
    await usuario.click(within(janela).getByRole('button', { name: 'Salvar categoria' }))

    expect(salvarCategoria).toHaveBeenCalledWith({ id: undefined, nome: 'Tortas', aceitaRecheioCobertura: true })
    expect(await screen.findByText('Categoria Tortas criada no fim da lista.')).toBeVisible()
    expect(nomes()).toEqual(['Bolos', 'Salgados', 'Doces finos', 'Tortas'])
  })

  test('mostra a explicação do backend quando ele recusa o nome', async () => {
    const usuario = userEvent.setup()
    salvarCategoria.mockRejectedValue(new CategoriaRecusadaError('Já existe a categoria "Pães".'))
    await abrir()

    await usuario.click(screen.getByRole('button', { name: 'Editar Salgados' }))
    const janela = await screen.findByRole('dialog', { name: 'Editar Salgados' })
    const nome = within(janela).getByRole('textbox', { name: 'Nome da categoria' })
    expect(nome).toHaveValue('Salgados')
    await usuario.clear(nome)
    await usuario.type(nome, 'Pães')
    await usuario.click(within(janela).getByRole('button', { name: 'Salvar categoria' }))

    expect(salvarCategoria).toHaveBeenCalledWith({ id: 2, nome: 'Pães', aceitaRecheioCobertura: false })
    expect(await within(janela).findByText('Já existe a categoria "Pães".')).toBeVisible()
  })

  test('categoria com produto não pode ser excluída: a janela explica o que fazer', async () => {
    const usuario = userEvent.setup()
    await abrir()

    await usuario.click(screen.getByRole('button', { name: 'Excluir Bolos' }))
    const janela = await screen.findByRole('dialog', { name: 'Não dá para excluir Bolos' })
    expect(within(janela).getByText(/Esta categoria tem 2 produtos. Mova os produtos desta categoria antes de excluí-la./)).toBeVisible()
    await usuario.click(within(janela).getByRole('button', { name: 'Entendi' }))

    expect(excluirCategoria).not.toHaveBeenCalled()
    expect(nomes()).toContain('Bolos')
  })

  test('exclui a categoria vazia depois de confirmar, com o foco começando em "Manter categoria"', async () => {
    const usuario = userEvent.setup()
    await abrir()

    await usuario.click(screen.getByRole('button', { name: 'Excluir Doces finos' }))
    const janela = await screen.findByRole('dialog', { name: 'Excluir Doces finos?' })
    expect(within(janela).getByRole('button', { name: 'Manter categoria' })).toHaveFocus()
    await usuario.click(within(janela).getByRole('button', { name: 'Excluir' }))

    expect(excluirCategoria).toHaveBeenCalledWith(3)
    expect(await screen.findByText('Categoria Doces finos excluída.')).toBeVisible()
    await waitFor(() => expect(nomes()).toEqual(['Bolos', 'Salgados']))
  })

  test('sem categorias, convida a criar a primeira', async () => {
    buscarCategorias.mockResolvedValue([])
    await abrir()

    expect(screen.getByRole('heading', { name: 'Nenhuma categoria ainda' })).toBeVisible()
  })

  test('avisa quando não consegue carregar', async () => {
    buscarCategorias.mockRejectedValue(new Error('falhou'))
    renderizarComRotas([{ path: '/categorias', Component: PaginaCategorias }], '/categorias')

    expect(await screen.findByText(/Não foi possível carregar as categorias agora/)).toBeVisible()
  })
})
