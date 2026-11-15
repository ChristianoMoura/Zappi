import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { buscarCategorias } from '../categorias/servicoCategorias'
import { aplicarPromocao, buscarProduto, buscarProdutos, encerrarPromocao, PromocaoRecusadaError, salvarProduto } from '../produtos/servicoProdutos'
import { renderizarComRotas } from '../testes/renderizarComRotas'
import { PaginaProduto } from './PaginaProduto'
import { PaginaProdutos } from './PaginaProdutos'

vi.mock('../produtos/servicoProdutos', async (importarOriginal) => ({
  ...(await importarOriginal()),
  buscarProdutos: vi.fn(),
  buscarProduto: vi.fn(),
  salvarProduto: vi.fn(),
  aplicarPromocao: vi.fn(),
  encerrarPromocao: vi.fn(),
}))
vi.mock('../categorias/servicoCategorias', async (importarOriginal) => ({ ...(await importarOriginal()), buscarCategorias: vi.fn() }))

const bolos = { id: 1, nome: 'Bolos' }
// Com o backend da promoção (ZAP-160), o produto traz `precoPromocional`, nulo sem promoção
const ninho = { id: 2, nome: 'Bolo de ninho com morango', categoria: bolos, unidade: 'KG', preco: 115, descricao: '', foto: '', textoAlternativo: '', alergenos: [], outrosAlergenos: '', noCardapio: true, precoPromocional: null }
const emPromocao = { ...ninho, precoPromocional: 99.9 }

const rotas = [
  { path: '/produtos', Component: PaginaProdutos },
  { path: '/produtos/:id', Component: PaginaProduto },
]

const secao = () => screen.getByRole('region', { name: 'Promoção' })

async function abrir(produto) {
  buscarProduto.mockResolvedValue(produto)
  renderizarComRotas(rotas, `/produtos/${produto.id}`)
  await screen.findByRole('heading', { level: 1, name: `Editar ${produto.nome}` })
}

describe('aplicar desconto na tela do produto (ZAP-161)', () => {
  beforeEach(() => {
    buscarProduto.mockReset()
    aplicarPromocao.mockReset()
    encerrarPromocao.mockReset()
    salvarProduto.mockReset().mockImplementation(async (dados) => ({ ...ninho, ...dados }))
    buscarCategorias.mockReset().mockResolvedValue([bolos])
    buscarProdutos.mockReset().mockResolvedValue([ninho])
  })

  test('sem o backend da promoção (produto sem o campo), a seção não aparece', async () => {
    const { precoPromocional, ...semCampo } = ninho // eslint-disable-line no-unused-vars
    await abrir(semCampo)

    expect(screen.queryByRole('region', { name: 'Promoção' })).not.toBeInTheDocument()
  })

  test('"Aplicar desconto" mostra os dois preços, com o preço antes já preenchido e o foco no preço com desconto', async () => {
    const usuario = userEvent.setup()
    await abrir(ninho)

    await usuario.click(within(secao()).getByRole('button', { name: 'Aplicar desconto' }))

    expect(within(secao()).getByRole('textbox', { name: /^Preço antes da promoção \(por kg\)/ })).toHaveValue('115,00')
    await waitFor(() => expect(within(secao()).getByRole('textbox', { name: /^Preço com desconto/ })).toHaveFocus())
  })

  test('preço com desconto igual ou maior que o preço antes é recusado na tela, com o erro junto do campo', async () => {
    const usuario = userEvent.setup()
    await abrir(ninho)
    await usuario.click(within(secao()).getByRole('button', { name: 'Aplicar desconto' }))

    await usuario.type(within(secao()).getByRole('textbox', { name: /^Preço com desconto/ }), '120')
    await usuario.click(within(secao()).getByRole('button', { name: 'Aplicar desconto' }))

    const desconto = within(secao()).getByRole('textbox', { name: /^Preço com desconto/ })
    expect(desconto).toHaveAccessibleDescription('O preço com desconto precisa ser menor que o preço antes da promoção.')
    expect(desconto).toHaveFocus()
    expect(aplicarPromocao).not.toHaveBeenCalled()
  })

  test('aplica o desconto: mostra "De ... por ...", o aviso e o botão de encerrar', async () => {
    const usuario = userEvent.setup()
    aplicarPromocao.mockResolvedValue(emPromocao)
    await abrir(ninho)
    await usuario.click(within(secao()).getByRole('button', { name: 'Aplicar desconto' }))

    await usuario.type(within(secao()).getByRole('textbox', { name: /^Preço com desconto/ }), '99,9')
    await usuario.click(within(secao()).getByRole('button', { name: 'Aplicar desconto' }))

    expect(aplicarPromocao).toHaveBeenCalledWith(2, { preco: 115, precoPromocional: 99.9 })
    expect(await within(secao()).findByText('Promoção', { selector: 'span' })).toBeInTheDocument()
    expect(secao()).toHaveTextContent('De R$ 115,00 por R$ 99,90 por kg')
    expect(screen.getByRole('status')).toHaveTextContent('Bolo de ninho com morango está em promoção: de R$ 115,00 por R$ 99,90.')
    await waitFor(() => expect(within(secao()).getByRole('button', { name: 'Encerrar promoção' })).toHaveFocus())
  })

  test('mudar o preço antes da promoção muda também o preço normal do produto', async () => {
    const usuario = userEvent.setup()
    aplicarPromocao.mockResolvedValue({ ...ninho, preco: 130, precoPromocional: 110 })
    await abrir(ninho)
    await usuario.click(within(secao()).getByRole('button', { name: 'Aplicar desconto' }))

    const antes = within(secao()).getByRole('textbox', { name: /^Preço antes da promoção/ })
    await usuario.clear(antes)
    await usuario.type(antes, '130')
    await usuario.type(within(secao()).getByRole('textbox', { name: /^Preço com desconto/ }), '110')
    await usuario.click(within(secao()).getByRole('button', { name: 'Aplicar desconto' }))

    expect(aplicarPromocao).toHaveBeenCalledWith(2, { preco: 130, precoPromocional: 110 })
    expect(await screen.findByRole('textbox', { name: /^Preço por kg/ })).toHaveValue('130,00')
  })

  test('o erro do backend aparece junto do campo', async () => {
    const usuario = userEvent.setup()
    aplicarPromocao.mockRejectedValue(new PromocaoRecusadaError({ precoPromocional: 'O preço com desconto precisa ser menor que o preço antes da promoção.' }))
    await abrir(ninho)
    await usuario.click(within(secao()).getByRole('button', { name: 'Aplicar desconto' }))
    await usuario.type(within(secao()).getByRole('textbox', { name: /^Preço com desconto/ }), '100')
    await usuario.click(within(secao()).getByRole('button', { name: 'Aplicar desconto' }))

    const desconto = within(secao()).getByRole('textbox', { name: /^Preço com desconto/ })
    await waitFor(() => expect(desconto).toHaveAccessibleDescription('O preço com desconto precisa ser menor que o preço antes da promoção.'))
    expect(desconto).toHaveFocus()
  })

  test('encerrar pede confirmação, com o foco em manter, e volta o produto ao preço normal', async () => {
    const usuario = userEvent.setup()
    encerrarPromocao.mockResolvedValue(ninho)
    await abrir(emPromocao)

    await usuario.click(within(secao()).getByRole('button', { name: 'Encerrar promoção' }))
    const janela = await screen.findByRole('dialog', { name: 'Encerrar a promoção?' })
    expect(janela).toHaveTextContent('Bolo de ninho com morango volta ao preço normal, R$ 115,00 por kg')
    await waitFor(() => expect(within(janela).getByRole('button', { name: 'Manter a promoção' })).toHaveFocus())

    await usuario.click(within(janela).getByRole('button', { name: 'Encerrar promoção' }))

    expect(encerrarPromocao).toHaveBeenCalledWith(2)
    expect(await within(secao()).findByRole('button', { name: 'Aplicar desconto' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('A promoção de Bolo de ninho com morango terminou. O preço voltou a R$ 115,00.')
  })

  test('com a promoção ativa, salvar o produto com o preço igual ou abaixo do com desconto é recusado', async () => {
    const usuario = userEvent.setup()
    await abrir(emPromocao)

    const preco = screen.getByRole('textbox', { name: /^Preço por kg/ })
    await usuario.clear(preco)
    await usuario.type(preco, '90')
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(preco).toHaveAccessibleDescription(/^Com a promoção ativa, o preço precisa ser maior que o preço com desconto \(R\$ 99,90\)/)
    expect(preco).toHaveFocus()
    expect(salvarProduto).not.toHaveBeenCalled()
  })

  test('a lista de produtos mostra o selo "Promoção", o preço antigo riscado e o "De ... por ..." para o leitor de tela', async () => {
    buscarProdutos.mockResolvedValue([emPromocao])
    renderizarComRotas(rotas, '/produtos')

    const cartao = await screen.findByRole('article', { name: 'Bolo de ninho com morango' })
    expect(within(cartao).getByText('Promoção')).toBeInTheDocument()
    expect(within(cartao).getByText('De R$ 115,00 por R$ 99,90')).toBeInTheDocument()
    expect(cartao.querySelector('s')).toHaveTextContent('R$ 115,00')
  })
})
