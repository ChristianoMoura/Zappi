import { createBrowserRouter, Navigate } from 'react-router'
import { LayoutPrincipal } from '../layout/LayoutPrincipal'
import { PaginaEstabelecimento } from '../paginas/PaginaEstabelecimento'
import { PaginaLogin } from '../paginas/PaginaLogin'
import { PaginaNaoEncontrada } from '../paginas/PaginaNaoEncontrada'
import { PaginaNovoPedido } from '../paginas/PaginaNovoPedido'
import { PaginaPedidos } from '../paginas/PaginaPedidos'
import { PaginaProduto } from '../paginas/PaginaProduto'
import { PaginaProdutos } from '../paginas/PaginaProdutos'
import { RotaProtegida } from './RotaProtegida'

export const rotas = createBrowserRouter([
  { path: '/login', Component: PaginaLogin },
  {
    Component: RotaProtegida,
    children: [
      {
        Component: LayoutPrincipal,
        children: [
          { index: true, element: <Navigate to="/pedidos" replace /> },
          { path: '/pedidos', Component: PaginaPedidos },
          { path: '/pedidos/novo', Component: PaginaNovoPedido },
          { path: '/produtos', Component: PaginaProdutos },
          { path: '/produtos/novo', Component: PaginaProduto },
          { path: '/produtos/:id', Component: PaginaProduto },
          { path: '/estabelecimento', Component: PaginaEstabelecimento },
        ],
      },
    ],
  },
  { path: '*', Component: PaginaNaoEncontrada },
])
