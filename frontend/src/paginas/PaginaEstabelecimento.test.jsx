import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
  buscarEstabelecimento,
  DadosInvalidosError,
  FotoNaoEnviadaError,
  LinkEmUsoError,
  salvarEstabelecimento,
} from '../estabelecimento/servicoEstabelecimento'
import { renderizarComRotas } from '../testes/renderizarComRotas'
import { PaginaEstabelecimento } from './PaginaEstabelecimento'

// O serviço é simulado aqui; as chamadas à API (ZAP-36) são testadas no servicoEstabelecimento.test.js
vi.mock('../estabelecimento/servicoEstabelecimento', async (importarOriginal) => ({
  ...(await importarOriginal()),
  buscarEstabelecimento: vi.fn(),
  salvarEstabelecimento: vi.fn(),
}))

const casaBelt = {
  nome: 'Casa Belt',
  descricao: 'Bolos e salgados artesanais sob encomenda.',
  slug: 'casa-belt',
  whatsapp: '5511900000000',
  emailContato: 'contato@casabelt.com',
  cep: '01000000',
  logradouro: 'Rua das Flores',
  numero: '123',
  complemento: '',
  bairro: 'Centro',
  cidade: 'São Paulo',
  uf: 'SP',
  logo: 'logo.webp',
  capa: '',
}

async function abrirTela() {
  renderizarComRotas([{ path: '/estabelecimento', Component: PaginaEstabelecimento }], '/estabelecimento')
  return screen.findByRole('textbox', { name: /Nome do estabelecimento/ })
}

const campo = (nome) => screen.getByRole('textbox', { name: nome })
const salvarBotao = () => screen.getByRole('button', { name: /Salvar alterações/ })

describe('PaginaEstabelecimento (US2, RF03, RF04)', () => {
  beforeEach(() => {
    buscarEstabelecimento.mockReset().mockResolvedValue(casaBelt)
    salvarEstabelecimento.mockReset().mockImplementation(async (dados) => dados)
    URL.createObjectURL = vi.fn(() => 'blob:foto-nova')
  })

  test('mostra os dados em cartões com rótulos visíveis (NBR 17225 5.3.1)', async () => {
    const nome = await abrirTela()

    expect(screen.getByRole('heading', { level: 1, name: 'Meu estabelecimento' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sobre o estabelecimento' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Contato' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Endereço' })).toBeVisible()
    expect(nome).toHaveValue('Casa Belt')
    expect(campo(/WhatsApp/)).toHaveValue('(11) 90000-0000')
    expect(screen.getByRole('img', { name: 'Logo de Casa Belt' })).toBeVisible()
  })

  test('avisa os erros, leva o foco ao primeiro e não chama o servidor (NBR 17225 5.1.4)', async () => {
    const usuario = userEvent.setup()
    const nome = await abrirTela()

    await usuario.clear(nome)
    await usuario.clear(campo(/WhatsApp/))
    await usuario.type(campo(/WhatsApp/), '119')
    await usuario.click(salvarBotao())

    expect(await screen.findByText('Digite o nome do estabelecimento.')).toBeVisible()
    expect(screen.getByText(/precisa ter DDD e 9 números/)).toBeVisible()
    expect(nome).toHaveFocus()
    expect(nome).toHaveAttribute('aria-invalid', 'true')
    expect(salvarEstabelecimento).not.toHaveBeenCalled()
  })

  test('salva com o WhatsApp no formato do banco e confirma', async () => {
    const usuario = userEvent.setup()
    const nome = await abrirTela()

    await usuario.clear(nome)
    await usuario.type(nome, 'Casa Belt Doces')
    await usuario.click(salvarBotao())

    await waitFor(() => expect(salvarEstabelecimento).toHaveBeenCalledTimes(1))
    expect(salvarEstabelecimento.mock.calls[0][0]).toMatchObject({ nome: 'Casa Belt Doces', whatsapp: '5511900000000', cep: '01000000' })
    expect(await screen.findByText('Dados salvos.')).toBeVisible()
  })

  test('explica quando o link já é de outro estabelecimento', async () => {
    const usuario = userEvent.setup()
    salvarEstabelecimento.mockRejectedValue(new LinkEmUsoError())
    await abrirTela()

    await usuario.click(salvarBotao())

    expect(await screen.findByText('Esse link já é usado por outro estabelecimento. Escolha outro.')).toBeVisible()
    expect(campo(/Link do cardápio/)).toHaveFocus()
  })

  test('mostra ao lado do campo a mensagem do servidor e leva o foco até ele', async () => {
    const usuario = userEvent.setup()
    salvarEstabelecimento.mockRejectedValue(new DadosInvalidosError({ cep: 'O CEP tem 8 números. Ex.: 01000-000' }))
    await abrirTela()

    await usuario.click(salvarBotao())

    expect(await screen.findByText('O CEP tem 8 números. Ex.: 01000-000')).toBeVisible()
    expect(campo(/CEP/)).toHaveFocus()
    expect(campo(/CEP/)).toHaveAttribute('aria-invalid', 'true')
  })

  test('se a foto não for enviada, explica o motivo e deixa tentar de novo com a foto escolhida', async () => {
    const usuario = userEvent.setup({ applyAccept: false })
    salvarEstabelecimento.mockRejectedValueOnce(
      new FotoNaoEnviadaError('Os dados foram salvos, mas o logo não foi enviado. Tente de novo em alguns minutos.', casaBelt),
    )
    await abrirTela()
    const [, arquivoLogo] = document.querySelectorAll('input[type="file"]')

    await usuario.upload(arquivoLogo, new File(['png'], 'logo.png', { type: 'image/png' }))
    await usuario.click(salvarBotao())

    expect(await screen.findByText('Os dados foram salvos, mas o logo não foi enviado. Tente de novo em alguns minutos.')).toBeVisible()
    expect(screen.getByRole('img', { name: 'Logo de Casa Belt' })).toHaveAttribute('src', 'blob:foto-nova')

    await usuario.click(salvarBotao())
    await waitFor(() => expect(salvarEstabelecimento).toHaveBeenCalledTimes(2))
    expect(salvarEstabelecimento.mock.calls[1][0]).toMatchObject({ logo: 'blob:foto-nova' })
  })

  test('"Sem número" bloqueia o campo com S/N e devolve o número ao desmarcar', async () => {
    const usuario = userEvent.setup()
    await abrirTela()
    const numero = campo('Número')

    await usuario.click(screen.getByRole('checkbox', { name: 'Sem número' }))
    expect(numero).toHaveValue('S/N')
    expect(numero).toBeDisabled()

    await usuario.click(screen.getByRole('checkbox', { name: 'Sem número' }))
    expect(numero).toHaveValue('123')
    expect(numero).toBeEnabled()
  })

  test('troca o logo com prévia e recusa formato errado', async () => {
    const usuario = userEvent.setup({ applyAccept: false })
    await abrirTela()
    const [arquivoCapa, arquivoLogo] = document.querySelectorAll('input[type="file"]')

    expect(screen.getByRole('button', { name: 'Trocar foto de capa' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Trocar logo' })).toBeVisible()

    await usuario.upload(arquivoLogo, new File(['gif'], 'logo.gif', { type: 'image/gif' }))
    expect(await screen.findByText('Use uma foto em JPG, PNG ou WebP.')).toBeVisible()

    await usuario.upload(arquivoLogo, new File(['png'], 'logo.png', { type: 'image/png' }))
    expect(await screen.findByText('Logo trocado. Salve para guardar.')).toBeVisible()
    expect(screen.getByRole('img', { name: 'Logo de Casa Belt' })).toHaveAttribute('src', 'blob:foto-nova')

    await usuario.click(screen.getByRole('button', { name: 'Desfazer' }))
    expect(screen.getByRole('img', { name: 'Logo de Casa Belt' })).toHaveAttribute('src', 'logo.webp')
    expect(arquivoCapa).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
  })
})
