import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { LayoutPrincipal } from '../layout/LayoutPrincipal'
import { usarTela } from '../testes/pedidosDeTeste'
import { renderizarComRotas } from '../testes/renderizarComRotas'
import { haQuantoTempo, nomeDoSino, textoContador } from './servicoNotificacoes'
import { INTERVALO_NOTIFICACOES } from './useNotificacoes'

// O quadro mostra qual pedido a notificação pediu para abrir
function QuadroDeTeste() {
  const { state } = useLocation()
  return <h1>Quadro {state?.abrir ? `abrindo #${state.abrir}` : ''}</h1>
}

const rotas = [{ Component: LayoutPrincipal, children: [{ path: '/pedidos', Component: QuadroDeTeste }, { path: '/produtos', element: <h1>Produtos</h1> }] }]

const json = (corpo, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })

const NOTIFICACOES = [
  { id: 12, tipo: 2, momento: 'DUAS_HORAS', numeroPedido: 9, dataRetirada: '2026-11-15T15:00:00', criadoEm: new Date(Date.now() - 5 * 60_000).toISOString(), vista: false, texto: 'Pedido #9 é retirado às 15h, daqui a 2 horas' },
  { id: 11, tipo: 1, momento: null, numeroPedido: 12, dataRetirada: '2026-11-22T15:00:00', criadoEm: new Date(Date.now() - 3 * 3600_000).toISOString(), vista: true, texto: 'Novo pedido #12. Retirada: sáb, 22/11, 15h' },
]

// API de teste: contagem, lista e marcar como vistas, com o que cada teste quiser trocar
function usarApi({ quantidade = 1, lista = NOTIFICACOES, statusLista = 200, statusContagem = 200 } = {}) {
  const chamadas = []
  const api = vi.fn(async (url, opcoes = {}) => {
    const metodo = opcoes.method ?? 'GET'
    chamadas.push(`${metodo} ${url}`)
    if (url.startsWith('/api/estabelecimento')) return json({ nome: 'Casa Belt' })
    if (url === '/api/notificacoes/nao-vistas') return statusContagem === 200 ? json({ quantidade: api.quantidade }) : new Response('', { status: statusContagem })
    if (url === '/api/notificacoes' && metodo === 'GET') return statusLista === 200 ? json(lista) : new Response('', { status: statusLista })
    if (url === '/api/notificacoes/vistas') {
      api.vistas = JSON.parse(opcoes.body).ids
      return new Response(null, { status: 204 })
    }
    return new Response('', { status: 404 })
  })
  api.quantidade = quantidade
  api.chamadas = chamadas
  vi.stubGlobal('fetch', api)
  return api
}

const sino = (nome = /^Notificações/) => screen.getByRole('button', { name: nome })

describe('sino de notificações (ZAP-175)', () => {
  beforeEach(() => {
    sessionStorage.setItem('zappi.sessao', JSON.stringify({ token: 'jwt-de-teste', nome: 'Lídia' }))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    sessionStorage.clear()
    localStorage.clear()
    usarTela(false)
  })

  test('no computador, fica no menu lateral acima de Pedidos, com a contagem no nome e no número', async () => {
    usarApi({ quantidade: 3 })
    usarTela(true)
    renderizarComRotas(rotas, '/produtos')

    const menu = screen.getByRole('navigation', { name: 'Menu principal' })
    const botao = await within(menu).findByRole('button', { name: 'Notificações, 3 não vistas' })
    expect(botao).toHaveTextContent('Notificações3')
    const itens = within(menu).getAllByRole('button').concat(within(menu).getAllByRole('link'))
    expect(itens[0]).toBe(botao)
    expect(botao.compareDocumentPosition(within(menu).getByRole('link', { name: 'Pedidos' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  test('com o menu recolhido, só o sino, com o nome no title', async () => {
    usarApi({ quantidade: 12 })
    usarTela(true)
    localStorage.setItem('zappi.menu-recolhido', 'true')
    renderizarComRotas(rotas, '/produtos')

    const botao = await screen.findByRole('button', { name: 'Notificações, 12 não vistas' })
    expect(botao).toHaveAttribute('title', 'Notificações')
    expect(botao).toHaveTextContent('9+')
  })

  test('no celular, fica no topo ao lado da conta, e a barra de baixo continua com três itens', async () => {
    usarApi({ quantidade: 0 })
    renderizarComRotas(rotas, '/produtos')

    const topo = screen.getByRole('banner')
    const botao = await within(topo).findByRole('button', { name: 'Notificações' })
    expect(botao).not.toHaveTextContent(/\d/)
    expect(within(topo).getByRole('button', { name: 'Minha conta' })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Menu principal' })).getAllByRole('link')).toHaveLength(3)
  })

  test('abrir mostra as notificações, marca as novas como vistas e zera o contador, mantendo o selo "Nova"', async () => {
    const usuario = userEvent.setup()
    const api = usarApi({ quantidade: 1 })
    renderizarComRotas(rotas, '/produtos')

    await usuario.click(await screen.findByRole('button', { name: 'Notificações, 1 não vista' }))
    const caixinha = await screen.findByRole('menu', { name: 'Notificações' })
    const itens = await within(caixinha).findAllByRole('menuitem')

    expect(itens.map((i) => i.textContent)).toEqual([
      'NovaPedido #9 é retirado às 15h, daqui a 2 horashá 5 min',
      'Novo pedido #12. Retirada: sáb, 22/11, 15hhá 3 h',
    ])
    await waitFor(() => expect(api.vistas).toEqual([12]))
    expect(sino()).toHaveAccessibleName('Notificações')
  })

  test('clicar numa notificação fecha a caixinha e abre o pedido no quadro', async () => {
    const usuario = userEvent.setup()
    usarApi()
    renderizarComRotas(rotas, '/produtos')

    await usuario.click(await screen.findByRole('button', { name: /^Notificações/ }))
    await usuario.click(await screen.findByRole('menuitem', { name: /Pedido #9/ }))

    expect(await screen.findByRole('heading', { name: 'Quadro abrindo #9' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
  })

  test('Esc fecha a caixinha e o foco volta ao sino', async () => {
    const usuario = userEvent.setup()
    usarApi({ lista: [] })
    renderizarComRotas(rotas, '/produtos')

    const botao = await screen.findByRole('button', { name: /^Notificações/ })
    await usuario.click(botao)
    expect(await screen.findByText('Nenhuma notificação por enquanto.')).toBeInTheDocument()

    await usuario.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
    expect(botao).toHaveFocus()
  })

  test('erro ao carregar mostra o aviso e o "Tentar de novo" busca outra vez', async () => {
    const usuario = userEvent.setup()
    const api = usarApi({ statusLista: 503 })
    renderizarComRotas(rotas, '/produtos')

    await usuario.click(await screen.findByRole('button', { name: /^Notificações/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as notificações agora.')

    api.mockImplementationOnce(async () => json(NOTIFICACOES))
    await usuario.click(screen.getByRole('menuitem', { name: 'Tentar de novo' }))
    expect(await screen.findByRole('menuitem', { name: /Pedido #9/ })).toBeInTheDocument()
  })

  test('sem a rota no backend (404), o sino não aparece', async () => {
    const api = usarApi({ statusContagem: 404 })
    usarTela(true)
    renderizarComRotas(rotas, '/produtos')

    await waitFor(() => expect(api.chamadas).toContain('GET /api/notificacoes/nao-vistas'))
    await waitFor(() => expect(screen.queryByRole('button', { name: /^Notificações/ })).not.toBeInTheDocument())
  })

  test('consulta de novo a cada minuto e avisa o leitor de tela quando chega notificação', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const api = usarApi({ quantidade: 1 })
    renderizarComRotas(rotas, '/produtos')
    await screen.findByRole('button', { name: 'Notificações, 1 não vista' })

    api.quantidade = 2
    await act(() => vi.advanceTimersByTime(INTERVALO_NOTIFICACOES))

    expect(await screen.findByRole('button', { name: 'Notificações, 2 não vistas' })).toBeInTheDocument()
    expect(screen.getByText('1 notificação nova')).toBeInTheDocument()
  })

  test('com a aba escondida, para de consultar, e volta a consultar ao reaparecer', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const api = usarApi({ quantidade: 0 })
    renderizarComRotas(rotas, '/produtos')
    await screen.findByRole('button', { name: 'Notificações' })
    const contagens = () => api.chamadas.filter((c) => c.endsWith('/nao-vistas')).length
    const antes = contagens()

    const visibilidade = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    await act(() => vi.advanceTimersByTime(INTERVALO_NOTIFICACOES * 3))
    expect(contagens()).toBe(antes)

    visibilidade.mockReturnValue('visible')
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    await waitFor(() => expect(contagens()).toBe(antes + 1))
  })
})

describe('textos do sino', () => {
  test('contador para em 9+, e o nome leva a contagem', () => {
    expect(textoContador(3)).toBe('3')
    expect(textoContador(10)).toBe('9+')
    expect(nomeDoSino(0)).toBe('Notificações')
    expect(nomeDoSino(1)).toBe('Notificações, 1 não vista')
  })

  test('há quanto tempo chegou', () => {
    const agora = new Date('2026-11-15T12:00:00Z')
    expect(haQuantoTempo('2026-11-15T11:59:40Z', agora)).toBe('agora')
    expect(haQuantoTempo('2026-11-15T11:55:00Z', agora)).toBe('há 5 min')
    expect(haQuantoTempo('2026-11-15T09:00:00Z', agora)).toBe('há 3 h')
    expect(haQuantoTempo('2026-11-14T10:00:00Z', agora)).toBe('há 1 dia')
    expect(haQuantoTempo('2026-11-12T10:00:00Z', agora)).toBe('há 3 dias')
  })
})
