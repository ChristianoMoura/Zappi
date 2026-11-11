import { screen } from '@testing-library/react'
import { vi } from 'vitest'
import { PaginaPedidos } from '../paginas/PaginaPedidos'
import { renderizarComRotas } from './renderizarComRotas'

// Dados e ajudantes comuns aos testes do quadro de pedidos (ZAP-46, ZAP-47, ZAP-51, ZAP-54)

export const mensagemDeTeste = (tipo, extras = {}) => ({
  tipo,
  status: 'Pendente',
  texto: `Texto de ${tipo}`,
  link: 'https://wa.me/?text=teste',
  ...extras,
})

export const pedidoDeTeste = (numero, status, nome, extras = {}) => ({
  numero,
  status,
  dataRetirada: '2030-01-15T15:00',
  criadoEm: '2030-01-10T10:00',
  cliente: { nome, telefone: '5511987650000' },
  itens: [{ produto: 'Bolo', sabor: 'Brigadeiro de chocolate', unidade: 'KG', quantidade: 2, precoUnitario: 100 }],
  mensagens: [],
  ...extras,
})

// Simula a largura da tela: o quadro usa (min-width: 48em) para separar computador e celular
export function usarTela(grande) {
  window.matchMedia.mockImplementation((consulta) => ({
    matches: grande,
    media: consulta,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

export const renderizarQuadro = () => renderizarComRotas([{ path: '/pedidos', Component: PaginaPedidos }], '/pedidos')

export function abrirQuadro() {
  renderizarQuadro()
  return screen.findByRole('heading', { level: 1, name: 'Pedidos' })
}

// Abre o quadro e os detalhes do pedido `numero`; devolve o painel de detalhes
export async function abrirPedido(usuario, numero) {
  renderizarQuadro()
  await usuario.click(await screen.findByRole('button', { name: new RegExp(`Pedido ${numero},`) }))
  return screen.findByRole('dialog', { name: `Pedido #${numero}` })
}
