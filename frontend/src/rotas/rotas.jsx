import { createBrowserRouter, Navigate } from 'react-router'
import { LayoutPrincipal } from '../layout/LayoutPrincipal'
import { PaginaCardapio } from '../paginas/PaginaCardapio'
import { PaginaEstabelecimento } from '../paginas/PaginaEstabelecimento'
import { PaginaLogin } from '../paginas/PaginaLogin'
import { PaginaNaoEncontrada } from '../paginas/PaginaNaoEncontrada'
import { PaginaFormularioPedido } from '../paginas/PaginaFormularioPedido'
import { PaginaPedidos } from '../paginas/PaginaPedidos'
import { PaginaProduto } from '../paginas/PaginaProduto'
import { PaginaProdutos } from '../paginas/PaginaProdutos'
import { RotaProtegida } from './RotaProtegida'

export const rotas = createBrowserRouter([
  { path: '/login', Component: PaginaLogin },
  // Portal do Cliente: cardápio público, sem login (RN02). Com /informacoes, mostra os dados da loja.
  { path: '/cardapio/:slug/:pagina?', Component: PaginaCardapio },
  {
    Component: RotaProtegida,
    children: [
      {
        Component: LayoutPrincipal,
        children: [
          { index: true, element: <Navigate to="/pedidos" replace /> },
          { path: '/pedidos', Component: PaginaPedidos },
          { path: '/pedidos/novo', Component: PaginaFormularioPedido },
          { path: '/pedidos/:numero/editar', Component: PaginaFormularioPedido },
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
