import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { dataMinima } from '../cardapio/regrasPedidoCliente'
import { buscarCardapio, EnviosDemaisError, enviarPedido, PedidoRecusadoError } from '../cardapio/servicoCardapio'
import { renderizarComRotas } from '../testes/renderizarComRotas'
import { PaginaCardapio } from './PaginaCardapio'

// O backend é simulado aqui; as chamadas à rota pública (ZAP-104) são testadas no servicoCardapio.test.js
vi.mock('../cardapio/servicoCardapio', async (importarOriginal) => ({
  ...(await importarOriginal()),
  buscarCardapio: vi.fn(),
  enviarPedido: vi.fn(),
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

  test('não envia sem data, hora, nome, WhatsApp e a caixa: erro junto de cada campo e foco no primeiro (ZAP-110)', async () => {
    localStorage.setItem('zappi.pedido.casa-belt', JSON.stringify({ itens: [{ chave: 1, produtoId: 1, quantidade: 1 }], data: '', hora: '', observacao: '' }))
    const usuario = userEvent.setup()
    abrir('/cardapio/casa-belt/pedido')

    await usuario.click(await screen.findByRole('button', { name: /Enviar pedido/ }))

    expect(screen.getByText('Escolha a data de retirada.')).toBeVisible()
    expect(screen.getByText('Escolha a hora de retirada.')).toBeVisible()
    expect(screen.getByText('Escreva seu nome.')).toBeVisible()
    expect(screen.getByText('Escreva seu WhatsApp com DDD.')).toBeVisible()
    expect(screen.getByText('Marque a caixa para enviar o pedido.')).toBeVisible()
    expect(screen.getByLabelText('Data')).toHaveFocus()
    expect(enviarPedido).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: /Fale com a loja pelo WhatsApp/ })).toHaveAttribute('href', expect.stringContaining('wa.me/5511900000000'))
  })

  test('com tudo preenchido, envia pelo Zappi, apaga o pedido guardado e mostra o "Pedido recebido" (ZAP-110)', async () => {
    const data = dataMinima()
    localStorage.setItem(
      'zappi.pedido.casa-belt',
      JSON.stringify({
        itens: [
          { chave: 1, produtoId: 1, quantidade: 2, observacao: ' Feliz aniversário ' },
          { chave: 2, produtoId: 9, quantidade: 1, nome: 'Torta de limão', unidade: 'UN' },
        ],
        data,
        hora: '',
        observacao: 'Festa',
      }),
    )
    enviarPedido.mockResolvedValue(128)
    const usuario = userEvent.setup()
    const roteador = abrir('/cardapio/casa-belt/pedido')

    await usuario.selectOptions(await screen.findByLabelText('Hora'), '15:30')
    await usuario.type(screen.getByRole('textbox', { name: 'Nome' }), ' Ana Souza ')
    const whatsapp = screen.getByRole('textbox', { name: 'WhatsApp' })
    await usuario.type(whatsapp, '11987654321')
    expect(whatsapp).toHaveValue('(11) 98765-4321')
    // Sem a frase de ajuda embaixo do WhatsApp e sem a frase sobre apagar os dados (pedido do Lucas)
    expect(screen.queryByText(/A confirmação chega por este número/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Para apagar seus dados/)).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('checkbox', { name: /Li e concordo com os Termos de uso e a Política de privacidade/ }))
    expect(screen.getByText('Seu pedido ainda não está confirmado. A loja vai avaliar e responder pelo WhatsApp.')).toBeVisible()

    await usuario.click(screen.getByRole('button', { name: /Enviar pedido/ }))

    expect(enviarPedido).toHaveBeenCalledWith('casa-belt', {
      cliente: { nome: 'Ana Souza', telefone: '5511987654321' },
      consentimentoLgpd: true,
      dataRetirada: data + 'T15:30:00-03:00',
      observacao: 'Festa',
      // O item indisponível (ZAP-156) não vai; o preço também não, quem decide é o backend
      itens: [{ produtoId: 1, quantidade: 2, observacao: 'Feliz aniversário' }],
      site: '',
    })
    expect(await screen.findByRole('heading', { level: 2, name: 'Pedido enviado!' })).toHaveFocus()
    expect(roteador.state.location.pathname).toBe('/cardapio/casa-belt/recebido')
    expect(screen.getByText('#128')).toBeVisible()
    expect(screen.getByText(/às 15h30/)).toBeVisible()
    expect(screen.getByText('O pagamento é na retirada. Não há entrega.')).toBeVisible()
    expect(guardado().itens).toEqual([])
  })

  test('o limite de envios mostra a mensagem do backend e mantém o pedido (ZAP-110, ZAP-112)', async () => {
    localStorage.setItem('zappi.pedido.casa-belt', JSON.stringify({ itens: [{ chave: 1, produtoId: 1, quantidade: 1 }], data: dataMinima(), hora: '15:30', observacao: '' }))
    enviarPedido.mockRejectedValue(new EnviosDemaisError('Você já enviou muitos pedidos. Tente mais tarde ou fale com a Lídia pelo WhatsApp.'))
    const usuario = userEvent.setup()
    abrir('/cardapio/casa-belt/pedido')

    await usuario.type(await screen.findByRole('textbox', { name: 'Nome' }), 'Ana')
    await usuario.type(screen.getByRole('textbox', { name: 'WhatsApp' }), '11987654321')
    await usuario.click(screen.getByRole('checkbox', { name: /Li e concordo/ }))
    await usuario.click(screen.getByRole('button', { name: /Enviar pedido/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Você já enviou muitos pedidos.')
    expect(guardado().itens).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Seu pedido' })).toBeVisible()
  })

  test('erro de um campo vindo do backend aparece junto dele, com o foco nele (ZAP-110)', async () => {
    localStorage.setItem('zappi.pedido.casa-belt', JSON.stringify({ itens: [{ chave: 1, produtoId: 1, quantidade: 1 }], data: dataMinima(), hora: '15:30', observacao: '' }))
    enviarPedido.mockRejectedValue(new PedidoRecusadoError('Confira os dados.', { 'cliente.telefone': 'O WhatsApp precisa ter DDD e 9 números. Ex.: (11) 90000-0000' }))
    const usuario = userEvent.setup()
    abrir('/cardapio/casa-belt/pedido')

    await usuario.type(await screen.findByRole('textbox', { name: 'Nome' }), 'Ana')
    await usuario.type(screen.getByRole('textbox', { name: 'WhatsApp' }), '11987654321')
    await usuario.click(screen.getByRole('checkbox', { name: /Li e concordo/ }))
    await usuario.click(screen.getByRole('button', { name: /Enviar pedido/ }))

    expect(await screen.findByText('O WhatsApp precisa ter DDD e 9 números. Ex.: (11) 90000-0000')).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'WhatsApp' })).toHaveFocus()
  })

  test('o campo invisível contra robôs fica fora da ordem de foco e escondido do leitor de tela (ZAP-103)', async () => {
    localStorage.setItem('zappi.pedido.casa-belt', JSON.stringify({ itens: [{ chave: 1, produtoId: 1, quantidade: 1 }], data: '', hora: '', observacao: '' }))
    abrir('/cardapio/casa-belt/pedido')

    await screen.findByRole('heading', { level: 1, name: 'Seu pedido' })
    const robo = document.querySelector('input[name="site"]')
    expect(robo).toHaveAttribute('tabindex', '-1')
    expect(robo.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(screen.queryByRole('textbox', { name: 'Site' })).not.toBeInTheDocument()
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

  test('item guardado antes da mudança, sem o nome, aparece como "Produto indisponível" (ZAP-156)', async () => {
    localStorage.setItem('zappi.pedido.casa-belt', JSON.stringify({ itens: [{ chave: 1, produtoId: 9, quantidade: 1 }], data: '', hora: '', observacao: '' }))
    abrir('/cardapio/casa-belt/pedido')

    expect(await screen.findByRole('heading', { level: 3, name: 'Produto indisponível' })).toBeVisible()
    expect(screen.getByText(/0 itens · 1 indisponível/)).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Seu pedido está vazio' })).not.toBeInTheDocument()
  })
})

describe('forma de pagamento no "Seu pedido" (ZAP-194)', () => {
  const comFormas = (formasPagamento) => {
    const cardapio = structuredClone(CARDAPIO)
    cardapio.estabelecimento.formasPagamento = formasPagamento
    return cardapio
  }
  const guardar = (extra = {}) =>
    localStorage.setItem('zappi.pedido.casa-belt', JSON.stringify({ itens: [{ chave: 1, produtoId: 1, quantidade: 1 }], data: dataMinima(), hora: '15:30', observacao: '', ...extra }))
  async function preencherDados(usuario) {
    await usuario.type(await screen.findByRole('textbox', { name: 'Nome' }), 'Ana')
    await usuario.type(screen.getByRole('textbox', { name: 'WhatsApp' }), '11987654321')
    await usuario.click(screen.getByRole('checkbox', { name: /Li e concordo/ }))
  }

  beforeEach(() => {
    window.scrollTo = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  test('sem escolher, não envia: erro junto do grupo e foco na primeira opção', async () => {
    buscarCardapio.mockResolvedValue(comFormas(['DINHEIRO', 'PIX', 'CREDITO']))
    guardar()
    const usuario = userEvent.setup()
    abrir('/cardapio/casa-belt/pedido')

    await preencherDados(usuario)
    const grupo = screen.getByRole('group', { name: 'Como você vai pagar?' })
    expect(within(grupo).getAllByRole('radio').map((r) => r.closest('label').textContent)).toEqual(['Dinheiro', 'Pix', 'Cartão de crédito'])
    expect(screen.queryByText('O pagamento é na retirada.')).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: /Enviar pedido/ }))

    expect(screen.getByText('Escolha como você vai pagar.')).toBeVisible()
    expect(within(grupo).getByRole('radio', { name: 'Dinheiro' })).toHaveFocus()
    expect(enviarPedido).not.toHaveBeenCalled()
  })

  test('a forma escolhida fica guardada, vai no envio e aparece no "Pedido recebido"', async () => {
    buscarCardapio.mockResolvedValue(comFormas(['DINHEIRO', 'PIX']))
    enviarPedido.mockResolvedValue(130)
    guardar()
    const usuario = userEvent.setup()
    abrir('/cardapio/casa-belt/pedido')

    await preencherDados(usuario)
    await usuario.click(screen.getByRole('radio', { name: 'Pix' }))
    expect(guardado().formaPagamento).toBe('PIX')
    await usuario.click(screen.getByRole('button', { name: /Enviar pedido/ }))

    expect(enviarPedido).toHaveBeenCalledWith('casa-belt', expect.objectContaining({ formaPagamento: 'PIX' }))
    expect(await screen.findByText(/na retirada\. Não há entrega\./)).toHaveTextContent('Pagamento: Pix, na retirada. Não há entrega.')
  })

  test('forma que a loja deixou de aceitar é apagada e o cliente escolhe de novo', async () => {
    buscarCardapio.mockResolvedValue(comFormas(['DINHEIRO', 'PIX']))
    guardar({ formaPagamento: 'VR' })
    abrir('/cardapio/casa-belt/pedido')

    const grupo = await screen.findByRole('group', { name: 'Como você vai pagar?' })
    expect(within(grupo).getAllByRole('radio').some((r) => r.checked)).toBe(false)
  })

  test('com uma forma só, ela já vem marcada', async () => {
    buscarCardapio.mockResolvedValue(comFormas(['PIX']))
    guardar()
    abrir('/cardapio/casa-belt/pedido')
    expect(await screen.findByRole('radio', { name: 'Pix' })).toBeChecked()
  })

  test('sem as formas na API (backend antigo), não pergunta a forma e envia como antes', async () => {
    buscarCardapio.mockResolvedValue(comFormas(undefined))
    enviarPedido.mockResolvedValue(131)
    guardar()
    const usuario = userEvent.setup()
    abrir('/cardapio/casa-belt/pedido')

    await preencherDados(usuario)
    expect(screen.queryByRole('group', { name: 'Como você vai pagar?' })).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: /Enviar pedido/ }))

    expect(enviarPedido.mock.calls[0][1]).not.toHaveProperty('formaPagamento')
  })
})

// Data de retirada no "Seu pedido" (ZAP-108, RN22). O relógio fica parado em 10/11/2026, às 15h em
// São Paulo: a primeira data permitida é 17/11/2026, e o dia 16 fica no mesmo mês do calendário
describe('data de retirada e pedido guardado no "Seu pedido" (ZAP-108)', () => {
  const guardar = (extra = {}) =>
    localStorage.setItem('zappi.pedido.casa-belt', JSON.stringify({ itens: [{ chave: 1, produtoId: 1, quantidade: 1 }], data: '', hora: '', observacao: '', ...extra }))

  beforeEach(() => {
    // Só a data é simulada: os outros relógios continuam reais, para o userEvent funcionar
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-10T18:00:00Z'))
    buscarCardapio.mockResolvedValue(structuredClone(CARDAPIO))
    window.scrollTo = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    localStorage.clear()
  })

  test.each([
    ['que já passou', '2026-11-09'],
    ['com menos de 7 dias', '2026-11-16'],
  ])('data %s não é aceita: o erro explica o motivo, junto do campo e com o foco nele', async (_caso, data) => {
    guardar({ data, hora: '15:00' })
    const usuario = userEvent.setup()
    abrir('/cardapio/casa-belt/pedido')

    await usuario.click(await screen.findByRole('button', { name: /Enviar pedido/ }))

    const erro = screen.getByText('Escolha uma data a partir de 17/11/2026. A loja precisa de pelo menos 7 dias para preparar a encomenda.')
    expect(erro).toBeVisible()
    expect(screen.getByLabelText('Data')).toHaveFocus()
    // O resumo da retirada só aparece com uma data válida
    expect(screen.queryByText(/^Retirada:/)).not.toBeInTheDocument()
    expect(enviarPedido).not.toHaveBeenCalled()
  })

  test('o calendário bloqueia os dias antes de 7 dias e aceita o sétimo dia', async () => {
    guardar()
    const usuario = userEvent.setup()
    abrir('/cardapio/casa-belt/pedido')

    await usuario.click(await screen.findByLabelText('Data'))

    expect(await screen.findByRole('button', { name: '16 de novembro de 2026' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '10 de novembro de 2026' })).toBeDisabled()
    const setimoDia = screen.getByRole('button', { name: '17 de novembro de 2026' })
    expect(setimoDia).toBeEnabled()

    await usuario.click(setimoDia)
    await usuario.selectOptions(screen.getByLabelText('Hora'), '08:00')

    expect(guardado()).toMatchObject({ data: '2026-11-17', hora: '08:00' })
    expect(screen.getByText(/^Retirada:/)).toHaveTextContent('Retirada: terça-feira, 17/11, às 8h')
  })

  test('abaixo do calendário, a frase leva ao WhatsApp da loja para quem precisa antes de 7 dias', async () => {
    guardar()
    abrir('/cardapio/casa-belt/pedido')

    const link = await screen.findByRole('link', { name: /Fale com a loja pelo WhatsApp/ })
    expect(link.closest('p')).toHaveTextContent('Precisa para antes de 7 dias? Fale com a loja pelo WhatsApp (abre o WhatsApp)')
    expect(link).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\/5511900000000\?text=/))
    expect(decodeURIComponent(link.getAttribute('href'))).toContain('Preciso de uma encomenda da Casa Belt para antes de 7 dias. É possível?')
    expect(link).toHaveAttribute('target', '_blank')
  })

  test('ao recarregar a página, o pedido continua com os itens, a data, a hora e a observação', async () => {
    guardar({ itens: [{ chave: 1, produtoId: 1, quantidade: 1.5 }] })
    const usuario = userEvent.setup()
    abrir('/cardapio/casa-belt/pedido')

    await usuario.click(await screen.findByLabelText('Data'))
    await usuario.click(await screen.findByRole('button', { name: '20 de novembro de 2026' }))
    await usuario.selectOptions(screen.getByLabelText('Hora'), '15:30')
    await usuario.type(screen.getByRole('textbox', { name: 'Observação do pedido' }), 'Festa da Ana')

    // Recarregar: a tela sai e volta, e só o que ficou guardado no navegador é usado
    cleanup()
    abrir('/cardapio/casa-belt/pedido')

    expect(await screen.findByText(/^Retirada:/)).toHaveTextContent('Retirada: sexta-feira, 20/11, às 15h30')
    expect(screen.getByLabelText('Hora')).toHaveValue('15:30')
    expect(screen.getByRole('textbox', { name: 'Observação do pedido' })).toHaveValue('Festa da Ana')
    expect(screen.getByRole('region', { name: 'Total' })).toHaveTextContent('R$ 150,00')
  })
})
