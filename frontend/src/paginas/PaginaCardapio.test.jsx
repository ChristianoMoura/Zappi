import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { buscarCardapio, CardapioNaoEncontradoError, ServicoIndisponivelError } from '../cardapio/servicoCardapio'
import { renderizarComRotas } from '../testes/renderizarComRotas'
import { PaginaCardapio } from './PaginaCardapio'

// O backend é simulado aqui; as chamadas à rota pública (ZAP-104) são testadas no servicoCardapio.test.js
vi.mock('../cardapio/servicoCardapio', async (importarOriginal) => ({
  ...(await importarOriginal()),
  buscarCardapio: vi.fn(),
}))

const CARDAPIO = {
  estabelecimento: { nome: 'Casa Belt', slug: 'casa-belt', descricao: 'Bolos e salgados artesanais sob encomenda.', whatsapp: '5511900000000', logo: 'logo.webp', capa: '' },
  // Categorias na ordem do painel: Salgados antes de Bolos (ZAP-140)
  categorias: [
    { id: 2, nome: 'Salgados' },
    { id: 1, nome: 'Bolos' },
  ],
  produtos: [
    { id: 1, nome: 'Bolo de brigadeiro de chocolate', categoriaId: 1, categoria: 'Bolos', unidade: 'KG', preco: 100, descricao: 'Massa de chocolate.', foto: 'bolo.jpg', textoAlternativo: 'Bolo coberto com granulado' },
    { id: 3, nome: 'Coxinha por unidade', categoriaId: 2, categoria: 'Salgados', unidade: 'UN', preco: 1.25, descricao: 'Coxinha de frango.', foto: '', textoAlternativo: '' },
  ],
}

function abrir(caminho = '/cardapio/casa-belt') {
  return renderizarComRotas([{ path: '/cardapio/:slug/*', Component: PaginaCardapio }], caminho)
}

describe('PaginaCardapio (ZAP-105)', () => {
  beforeEach(() => {
    buscarCardapio.mockResolvedValue(structuredClone(CARDAPIO))
  })

  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  test('abre sem login e mostra a loja e os produtos por categoria, com preço e unidade', async () => {
    abrir()

    expect(screen.getByRole('heading', { name: 'Abrindo o cardápio…' })).toBeVisible()
    expect(await screen.findByRole('heading', { level: 1, name: 'Casa Belt' })).toBeVisible()
    expect(buscarCardapio).toHaveBeenCalledWith('casa-belt')
    expect(screen.getByRole('img', { name: 'Logo de Casa Belt' })).toBeVisible()
    expect(screen.getByText(/pelo menos 7 dias de antecedência/)).toBeVisible()

    const bolos = screen.getByRole('region', { name: 'Bolos' })
    expect(within(bolos).getByRole('heading', { name: 'Bolo de brigadeiro de chocolate' })).toBeVisible()
    expect(within(bolos).getByText('R$ 100,00')).toBeVisible()
    expect(within(bolos).getByText('por kg')).toBeVisible()
    expect(within(bolos).getByRole('img', { name: 'Bolo coberto com granulado' })).toBeVisible()

    const salgados = screen.getByRole('region', { name: 'Salgados' })
    expect(within(salgados).getByText('Sem foto')).toBeVisible()
    expect(within(salgados).getByText('por unidade')).toBeVisible()

    expect(screen.getByRole('link', { name: /Falar com a loja no WhatsApp/ })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\/5511900000000\?text=/))
  })

  test('link de loja que não existe mostra uma mensagem clara', async () => {
    buscarCardapio.mockRejectedValue(new CardapioNaoEncontradoError())
    abrir('/cardapio/nao-existe')

    expect(await screen.findByRole('heading', { name: 'Cardápio não encontrado' })).toBeVisible()
  })

  test('erro ao carregar oferece tentar de novo', async () => {
    buscarCardapio.mockRejectedValueOnce(new ServicoIndisponivelError())
    const usuario = userEvent.setup()
    abrir()

    await usuario.click(await screen.findByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Casa Belt' })).toBeVisible()
    expect(buscarCardapio).toHaveBeenCalledTimes(2)
  })

  test('cardápio sem produtos avisa e mantém o WhatsApp', async () => {
    buscarCardapio.mockResolvedValue({ ...structuredClone(CARDAPIO), produtos: [] })
    abrir()

    expect(await screen.findByRole('heading', { name: 'Ainda não há produtos no cardápio' })).toBeVisible()
    expect(screen.getByRole('link', { name: /Falar com a loja no WhatsApp/ })).toBeVisible()
  })

  test('a busca filtra os produtos e avisa quando nada combina', async () => {
    const usuario = userEvent.setup()
    abrir()

    await usuario.click(await screen.findByRole('button', { name: 'Buscar no cardápio' }))
    const campo = screen.getByRole('searchbox', { name: 'Buscar no cardápio' })
    await usuario.type(campo, 'coxinha')

    expect(screen.queryByRole('heading', { name: 'Bolo de brigadeiro de chocolate' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Coxinha por unidade' })).toBeVisible()

    await usuario.clear(campo)
    await usuario.type(campo, 'pastel')
    expect(screen.getByText('Nenhum produto encontrado.')).toBeVisible()

    // A busca também acha pelo nome da categoria (ZAP-140)
    await usuario.clear(campo)
    await usuario.type(campo, 'salgados')
    expect(screen.getByRole('heading', { name: 'Coxinha por unidade' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Bolo de brigadeiro de chocolate' })).not.toBeInTheDocument()
  })

  test('seções, abas e janela "Categorias" seguem as categorias do painel, na ordem da loja (ZAP-140)', async () => {
    const usuario = userEvent.setup()
    abrir()

    await screen.findByRole('heading', { level: 1, name: 'Casa Belt' })
    expect(screen.getAllByRole('region').map((secao) => secao.getAttribute('aria-labelledby'))).toEqual(['titulo-2', 'titulo-1'])
    const abas = screen.getByRole('navigation', { name: 'Categorias do cardápio' })
    expect(within(abas).getAllByRole('button').slice(1).map((aba) => aba.textContent)).toEqual(['Salgados', 'Bolos'])

    await usuario.click(within(abas).getByRole('button', { name: 'Ver todas as categorias' }))
    const janela = await screen.findByRole('dialog', { name: 'Categorias' })
    expect(within(janela).getByRole('button', { name: /Salgados/ })).toHaveTextContent('1 produto')
    expect(within(janela).getByRole('button', { name: /Bolos/ })).toBeVisible()
  })

  test('o tema escuro alterna pelo ícone e fica guardado no navegador', async () => {
    const usuario = userEvent.setup()
    abrir()

    await usuario.click(await screen.findByRole('button', { name: 'Usar tema escuro' }))

    expect(screen.getByRole('button', { name: 'Usar tema claro' })).toBeVisible()
    expect(localStorage.getItem('zappi.cardapio.tema')).toBe('escuro')
  })

  test('o produto abre na página de detalhes', async () => {
    const usuario = userEvent.setup()
    const roteador = abrir()

    await usuario.click(await screen.findByRole('button', { name: /Bolo de brigadeiro de chocolate/ }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Detalhes do produto' })).toBeVisible()
    expect(screen.getByRole('heading', { level: 2, name: 'Bolo de brigadeiro de chocolate' })).toBeVisible()
    expect(screen.getByText('Bolos')).toBeVisible()
    expect(roteador.state.location.pathname).toBe('/cardapio/casa-belt/produto/1')
  })

  test('"Mais informações" mostra as regras da encomenda, o contato e o mapa da retirada', async () => {
    const usuario = userEvent.setup()
    abrir()

    await usuario.click(await screen.findByRole('link', { name: 'Mais informações' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Informações da loja' })).toBeVisible()
    expect(screen.getByText('Encomende com pelo menos 7 dias.')).toBeVisible()
    expect(screen.getByText('Na retirada.')).toBeVisible()
    expect(screen.getByText('WhatsApp: (11) 90000-0000')).toBeVisible()
    expect(buscarCardapio).toHaveBeenCalledTimes(1)

    const pagamento = screen.getByRole('region', { name: 'Formas de pagamento' })
    expect(within(pagamento).getAllByRole('listitem').map((item) => item.querySelector('b').textContent)).toEqual(['Pix', 'Cartão de crédito', 'Cartão de débito'])
    expect(within(pagamento).queryByText('Pagamento na retirada')).not.toBeInTheDocument()

    // Sem endereço cadastrado, a retirada é combinada pelo WhatsApp, sem mapa (ZAP-186)
    const retirada = screen.getByRole('region', { name: 'Retirada' })
    expect(within(retirada).getByText('Combine o local de retirada pelo WhatsApp.')).toBeVisible()
    expect(within(retirada).getByRole('link', { name: /Combinar pelo WhatsApp/ })).toHaveAttribute('href', expect.stringContaining('https://wa.me/5511900000000'))
    expect(within(retirada).queryByTitle(/Mapa do local de retirada/)).not.toBeInTheDocument()
  })
})

describe('Promoção no cardápio público (ZAP-162)', () => {
  const comPromocao = (destacarPromocoes = true) => {
    const cardapio = structuredClone(CARDAPIO)
    cardapio.estabelecimento.destacarPromocoes = destacarPromocoes
    cardapio.produtos[1].precoPromocional = 1.1
    cardapio.produtos.push({ id: 5, nome: 'Bolo de ninho com morango', categoriaId: 1, categoria: 'Bolos', unidade: 'KG', preco: 115, precoPromocional: 100, descricao: 'Ninho.', foto: 'ninho.jpg', textoAlternativo: '' })
    return cardapio
  }

  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  test('a seção Promoções vem no topo, na ordem das categorias, e o produto continua na categoria', async () => {
    buscarCardapio.mockResolvedValue(comPromocao())
    abrir()

    await screen.findByRole('heading', { level: 1, name: 'Casa Belt' })
    const abas = screen.getByRole('navigation', { name: 'Categorias do cardápio' })
    expect(within(abas).getAllByRole('button').slice(1).map((aba) => aba.textContent)).toEqual(['Promoções', 'Salgados', 'Bolos'])
    const faixa = screen.getByRole('list', { name: 'Produtos em promoção' })
    expect(within(faixa).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Coxinha por unidade, De R$ 1,25 por R$ 1,10 por unidade, 12% de desconto',
      'Bolo de ninho com morango, De R$ 115,00 por R$ 100,00 por kg, 13% de desconto',
    ])
    expect(within(faixa).getByText('-13%')).toBeInTheDocument()
    // Na categoria, o preço antigo riscado, o novo e o "-13%"; o leitor de tela ouve o "De ... por ..."
    const bolos = screen.getByRole('region', { name: 'Bolos' })
    expect(within(bolos).getByText('De R$ 115,00 por R$ 100,00 por kg, 13% de desconto')).toBeInTheDocument()
    expect(within(bolos).getByText('R$ 115,00').tagName).toBe('S')
  })

  test('o cartão da faixa abre o detalhe do produto', async () => {
    buscarCardapio.mockResolvedValue(comPromocao())
    const usuario = userEvent.setup()
    const roteador = abrir()

    const faixa = await screen.findByRole('list', { name: 'Produtos em promoção' })
    await usuario.click(within(faixa).getByRole('button', { name: /^Bolo de ninho com morango/ }))

    expect(roteador.state.location.pathname).toBe('/cardapio/casa-belt/produto/5')
  })

  test('na busca, a seção sai para o produto não aparecer duas vezes', async () => {
    buscarCardapio.mockResolvedValue(comPromocao())
    const usuario = userEvent.setup()
    abrir()

    await usuario.click(await screen.findByRole('button', { name: 'Buscar no cardápio' }))
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar no cardápio' }), 'ninho')

    expect(screen.queryByRole('list', { name: 'Produtos em promoção' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3, name: 'Bolo de ninho com morango' })).toHaveLength(1)
  })

  test('com o destaque desligado, a seção some, mas o preço com desconto continua', async () => {
    buscarCardapio.mockResolvedValue(comPromocao(false))
    abrir()

    await screen.findByRole('heading', { level: 1, name: 'Casa Belt' })
    expect(screen.queryByRole('list', { name: 'Produtos em promoção' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Promoções' })).not.toBeInTheDocument()
    expect(screen.getByText('De R$ 115,00 por R$ 100,00 por kg, 13% de desconto')).toBeInTheDocument()
  })

  test('o "Seu pedido" usa o preço com desconto no subtotal e no total', async () => {
    buscarCardapio.mockResolvedValue(comPromocao())
    localStorage.setItem('zappi.pedido.casa-belt', JSON.stringify({ itens: [{ chave: 1, produtoId: 5, quantidade: 1.5 }], data: '', hora: '', observacao: '' }))
    abrir('/cardapio/casa-belt/pedido')

    expect(await screen.findByRole('region', { name: 'Total' })).toHaveTextContent('R$ 150,00')
  })
})

describe('formas de pagamento em "Mais informações" (ZAP-194)', () => {
  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  test('mostra só as formas que a loja aceita, na ordem da lista, sem repetir "Pagamento na retirada"', async () => {
    const cardapio = structuredClone(CARDAPIO)
    cardapio.estabelecimento.formasPagamento = ['DINHEIRO', 'PIX', 'VR']
    buscarCardapio.mockResolvedValue(cardapio)
    abrir('/cardapio/casa-belt/informacoes')

    const pagamento = await screen.findByRole('region', { name: 'Formas de pagamento' })
    expect(within(pagamento).getAllByRole('listitem').map((item) => item.querySelector('b').textContent)).toEqual(['Dinheiro', 'Pix', 'Vale-refeição (VR)'])
    expect(within(pagamento).queryByText('Pagamento na retirada')).not.toBeInTheDocument()
  })
})

describe('endereço e mapa da retirada (ZAP-186)', () => {
  const comEndereco = () => {
    const cardapio = structuredClone(CARDAPIO)
    cardapio.estabelecimento.endereco = { cep: '01000000', logradouro: 'Rua das Flores', numero: '123', complemento: 'casa 2', bairro: 'Centro', cidade: 'São Paulo', uf: 'SP' }
    return cardapio
  }
  const ENDERECO = 'Rua das Flores, 123, casa 2 · Centro, São Paulo/SP · CEP 01000-000'

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    localStorage.clear()
  })

  test('com a chave: endereço por extenso, mapa do Google e o botão para abrir no Google Maps', async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_CHAVE', 'chave-teste')
    buscarCardapio.mockResolvedValue(comEndereco())
    abrir('/cardapio/casa-belt/informacoes')

    const retirada = await screen.findByRole('region', { name: 'Retirada' })
    expect(within(retirada).getByText('Rua das Flores, 123, casa 2')).toBeVisible()
    expect(within(retirada).getByText('Centro, São Paulo/SP')).toBeVisible()
    expect(within(retirada).getByText('CEP 01000-000')).toBeVisible()
    const mapa = within(retirada).getByTitle(`Mapa do local de retirada: ${ENDERECO}`)
    expect(mapa).toHaveAttribute('src', expect.stringMatching(/^https:\/\/www\.google\.com\/maps\/embed\/v1\/place\?key=chave-teste&q=/))
    expect(mapa).toHaveAttribute('loading', 'lazy')
    const abrirMapa = within(retirada).getByRole('link', { name: /Abrir no Google Maps/ })
    expect(abrirMapa).toHaveAttribute('href', expect.stringMatching(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/))
    expect(abrirMapa).toHaveAttribute('target', '_blank')
    expect(abrirMapa).toHaveTextContent('(abre em outra aba)')
  })

  test('sem a chave: endereço e o botão, sem o mapa embutido', async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_CHAVE', '')
    buscarCardapio.mockResolvedValue(comEndereco())
    abrir('/cardapio/casa-belt/informacoes')

    const retirada = await screen.findByRole('region', { name: 'Retirada' })
    expect(within(retirada).getByText('Rua das Flores, 123, casa 2')).toBeVisible()
    expect(within(retirada).queryByTitle(/Mapa do local de retirada/)).not.toBeInTheDocument()
    expect(within(retirada).getByRole('link', { name: /Abrir no Google Maps/ })).toBeVisible()
  })

  // ---------- ZAP-187 ----------

  // Lê a busca (q ou query) da URL do Google, para conferir que vai o endereço da loja
  const buscaDaUrl = (url, parametro) => new URL(url).searchParams.get(parametro)
  const BUSCA = 'Rua das Flores, 123, casa 2, Centro, São Paulo/SP, 01000000'

  test('o mapa e o botão levam o endereço da loja na URL do Google Maps (ZAP-187)', async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_CHAVE', 'chave-teste')
    buscarCardapio.mockResolvedValue(comEndereco())
    abrir('/cardapio/casa-belt/informacoes')

    const retirada = await screen.findByRole('region', { name: 'Retirada' })
    const mapa = within(retirada).getByTitle(`Mapa do local de retirada: ${ENDERECO}`)
    expect(buscaDaUrl(mapa.src, 'q')).toBe(BUSCA)
    expect(buscaDaUrl(mapa.src, 'key')).toBe('chave-teste')
    expect(buscaDaUrl(within(retirada).getByRole('link', { name: /Abrir no Google Maps/ }).href, 'query')).toBe(BUSCA)
    // O endereço de exemplo antigo saiu (ZAP-183)
    expect(screen.queryByText(/Endereço ilustrativo/)).not.toBeInTheDocument()
  })

  test('o mapa não prende o foco do teclado: o Tab vai direto ao botão (NBR 17225 5.1.1, ZAP-187)', async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_CHAVE', 'chave-teste')
    buscarCardapio.mockResolvedValue(comEndereco())
    abrir('/cardapio/casa-belt/informacoes')

    const retirada = await screen.findByRole('region', { name: 'Retirada' })
    expect(within(retirada).getByTitle(/Mapa do local de retirada/)).toHaveAttribute('tabindex', '-1')
    const focaveis = within(retirada).queryAllByRole('link')
    expect(focaveis.map((link) => link.textContent)).toEqual([expect.stringContaining('Abrir no Google Maps')])
  })

  test('outro endereço salvo no painel aparece no texto, no mapa e no botão (ZAP-187)', async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_CHAVE', 'chave-teste')
    const cardapio = comEndereco()
    cardapio.estabelecimento.endereco = { cep: '04001000', logradouro: 'Rua Nova', numero: '45', complemento: '', bairro: 'Paraíso', cidade: 'São Paulo', uf: 'SP' }
    buscarCardapio.mockResolvedValue(cardapio)
    abrir('/cardapio/casa-belt/informacoes')

    const retirada = await screen.findByRole('region', { name: 'Retirada' })
    expect(within(retirada).getByText('Rua Nova, 45')).toBeVisible()
    expect(within(retirada).queryByText(/Rua das Flores/)).not.toBeInTheDocument()
    const mapa = within(retirada).getByTitle('Mapa do local de retirada: Rua Nova, 45 · Paraíso, São Paulo/SP · CEP 04001-000')
    expect(buscaDaUrl(mapa.src, 'q')).toBe('Rua Nova, 45, Paraíso, São Paulo/SP, 04001000')
    expect(buscaDaUrl(within(retirada).getByRole('link', { name: /Abrir no Google Maps/ }).href, 'query')).toBe('Rua Nova, 45, Paraíso, São Paulo/SP, 04001000')
  })

  test.each([
    ['sem endereço', null],
    ['com o endereço incompleto (sem número)', { cep: '01000000', logradouro: 'Rua das Flores', numero: null, complemento: null, bairro: 'Centro', cidade: 'São Paulo', uf: 'SP' }],
  ])('%s, pede para combinar pelo WhatsApp e não mostra mapa, mesmo com a chave (ZAP-187)', async (_caso, endereco) => {
    vi.stubEnv('VITE_GOOGLE_MAPS_CHAVE', 'chave-teste')
    const cardapio = structuredClone(CARDAPIO)
    cardapio.estabelecimento.endereco = endereco
    buscarCardapio.mockResolvedValue(cardapio)
    abrir('/cardapio/casa-belt/informacoes')

    const retirada = await screen.findByRole('region', { name: 'Retirada' })
    expect(within(retirada).getByText('Combine o local de retirada pelo WhatsApp.')).toBeVisible()
    expect(within(retirada).getByRole('link', { name: /Combinar pelo WhatsApp/ })).toBeVisible()
    expect(within(retirada).queryByTitle(/Mapa do local de retirada/)).not.toBeInTheDocument()
    expect(within(retirada).queryByRole('link', { name: /Abrir no Google Maps/ })).not.toBeInTheDocument()
    expect(within(retirada).queryByText(/Rua das Flores/)).not.toBeInTheDocument()
  })

  test('a mensagem do WhatsApp continua sem o endereço (ZAP-183, ZAP-187)', async () => {
    buscarCardapio.mockResolvedValue(comEndereco())
    abrir('/cardapio/casa-belt/informacoes')

    await screen.findByRole('region', { name: 'Retirada' })
    for (const link of screen.getAllByRole('link', { name: /WhatsApp/ })) {
      const texto = buscaDaUrl(link.href, 'text') ?? ''
      expect(texto).not.toMatch(/Rua das Flores|01000/)
    }
  })

  test('nenhum teste usa a chave real: sem stub, a chave do Google fica vazia (ZAP-187)', () => {
    // vite.config.js zera a chave nos testes, mesmo com um .env.local com a chave da equipe
    expect(import.meta.env.VITE_GOOGLE_MAPS_CHAVE).toBe('')
  })
})

describe('e-mail no contato de "Informações da loja"', () => {
  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  test('mostra o e-mail da loja embaixo do WhatsApp, com link para escrever', async () => {
    const cardapio = structuredClone(CARDAPIO)
    cardapio.estabelecimento.emailContato = 'contato@casabelt.com'
    buscarCardapio.mockResolvedValue(cardapio)
    abrir('/cardapio/casa-belt/informacoes')

    const contato = await screen.findByRole('region', { name: 'Contato' })
    expect(within(contato).getByText('WhatsApp: (11) 90000-0000')).toBeVisible()
    expect(within(contato).getByRole('link', { name: 'contato@casabelt.com' })).toHaveAttribute('href', 'mailto:contato@casabelt.com')
  })

  test('sem e-mail cadastrado (ou sem o campo na API), não mostra a linha', async () => {
    buscarCardapio.mockResolvedValue(structuredClone(CARDAPIO))
    abrir('/cardapio/casa-belt/informacoes')

    const contato = await screen.findByRole('region', { name: 'Contato' })
    expect(within(contato).queryByText(/E-mail/)).not.toBeInTheDocument()
  })
})
