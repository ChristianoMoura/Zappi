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
import { BuscaCepIndisponivelError, buscarEnderecoPorCep, CepNaoEncontradoError } from '../estabelecimento/buscarEndereco'
import { renderizarComRotas } from '../testes/renderizarComRotas'
import { PaginaEstabelecimento } from './PaginaEstabelecimento'

// A busca do endereço pelo CEP é simulada; as APIs são testadas no buscarEndereco.test.js (ZAP-121)
vi.mock('../estabelecimento/buscarEndereco', async (importarOriginal) => ({
  ...(await importarOriginal()),
  buscarEnderecoPorCep: vi.fn(),
}))

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
    buscarEnderecoPorCep.mockReset().mockResolvedValue({ logradouro: 'Praça da Sé', bairro: 'Sé', cidade: 'São Paulo', uf: 'SP' })
    URL.createObjectURL = vi.fn(() => 'blob:foto-nova')
  })

  describe('endereço pelo CEP (ZAP-121)', () => {
    async function digitarCep(usuario, cep) {
      await usuario.clear(campo(/CEP/))
      await usuario.type(campo(/CEP/), cep)
    }

    test('com um CEP novo, preenche rua, bairro, cidade e estado e leva o foco ao número', async () => {
      const usuario = userEvent.setup()
      await abrirTela()

      await digitarCep(usuario, '01001-000')

      expect(await screen.findByText('Endereço preenchido pelo CEP. Confira e complete o número.')).toBeVisible()
      expect(buscarEnderecoPorCep).toHaveBeenCalledTimes(1)
      expect(buscarEnderecoPorCep).toHaveBeenCalledWith('01001000')
      expect(campo('Rua')).toHaveValue('Praça da Sé')
      expect(campo('Bairro')).toHaveValue('Sé')
      expect(campo('Cidade')).toHaveValue('São Paulo')
      expect(screen.getByRole('combobox', { name: /Estado/ })).toHaveValue('SP')
      await waitFor(() => expect(campo('Número')).toHaveFocus())
    })

    test('o endereço preenchido pode ser corrigido e é salvo como ficou', async () => {
      const usuario = userEvent.setup()
      await abrirTela()
      await digitarCep(usuario, '01001000')
      await screen.findByText('Endereço preenchido pelo CEP. Confira e complete o número.')

      await usuario.clear(campo('Rua'))
      await usuario.type(campo('Rua'), 'Praça da Sé, lado ímpar')
      await usuario.click(salvarBotao())

      await waitFor(() => expect(salvarEstabelecimento).toHaveBeenCalledTimes(1))
      expect(salvarEstabelecimento.mock.calls[0][0]).toMatchObject({ cep: '01001000', logradouro: 'Praça da Sé, lado ímpar', bairro: 'Sé' })
      // Corrigir a rua não busca o CEP de novo
      expect(buscarEnderecoPorCep).toHaveBeenCalledTimes(1)
    })

    test('CEP não encontrado: avisa e não apaga o que já estava digitado', async () => {
      const usuario = userEvent.setup()
      buscarEnderecoPorCep.mockRejectedValue(new CepNaoEncontradoError())
      await abrirTela()

      await digitarCep(usuario, '99999999')

      expect(await screen.findByText('Não encontramos esse CEP. Confira os números ou preencha o endereço.')).toBeVisible()
      expect(campo('Rua')).toHaveValue('Rua das Flores')
      expect(campo('Cidade')).toHaveValue('São Paulo')
    })

    test('sem as APIs, avisa e deixa preencher à mão e salvar', async () => {
      const usuario = userEvent.setup()
      buscarEnderecoPorCep.mockRejectedValue(new BuscaCepIndisponivelError())
      await abrirTela()

      await digitarCep(usuario, '02002000')
      expect(await screen.findByText('Não foi possível buscar o endereço agora. Preencha os campos do endereço.')).toBeVisible()

      await usuario.clear(campo('Rua'))
      await usuario.type(campo('Rua'), 'Rua Nova')
      await usuario.click(salvarBotao())

      await waitFor(() => expect(salvarEstabelecimento).toHaveBeenCalledTimes(1))
      expect(salvarEstabelecimento.mock.calls[0][0]).toMatchObject({ cep: '02002000', logradouro: 'Rua Nova' })
    })

    test('ao abrir a tela com o CEP já salvo, não busca nada', async () => {
      await abrirTela()

      expect(campo(/CEP/)).toHaveValue('01000-000')
      expect(buscarEnderecoPorCep).not.toHaveBeenCalled()
    })
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

  test('o Tab segue a ordem visual do formulário, do nome até salvar (NBR 17225 5.1.4)', async () => {
    const usuario = userEvent.setup()
    const nome = await abrirTela()
    await usuario.click(nome)

    const ordem = [
      campo(/^Descrição/),
      campo(/^Link do cardápio/),
      campo(/^WhatsApp/),
      campo(/^E-mail/),
      campo(/^CEP/),
      campo(/^Rua/),
      campo(/^Número/),
      screen.getByRole('checkbox', { name: 'Sem número' }),
      campo(/^Complemento/),
      campo(/^Bairro/),
      campo(/^Cidade/),
      screen.getByRole('combobox', { name: /^Estado/ }),
      salvarBotao(),
    ]
    for (const elemento of ordem) {
      await usuario.tab()
      expect(elemento).toHaveFocus()
    }
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
