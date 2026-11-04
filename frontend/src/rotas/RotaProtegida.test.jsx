import { screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { renderizarComRotas } from '../testes/renderizarComRotas'
import { RotaProtegida } from './RotaProtegida'

function abrirPedidos() {
  return renderizarComRotas(
    [
      { path: '/login', element: <h1>Login</h1> },
      {
        Component: RotaProtegida,
        children: [{ path: '/pedidos', element: <h1>Pedidos</h1> }],
      },
    ],
    '/pedidos',
  )
}

describe('RotaProtegida (ISO 27002 5.15)', () => {
  test('sem sessão, manda para o login e guarda a página pedida', () => {
    const roteador = abrirPedidos()

    expect(screen.getByRole('heading', { name: 'Login' })).toBeVisible()
    expect(roteador.state.location.state).toEqual({ voltarPara: '/pedidos' })
  })

  test('com a sessão salva, continua na página ao recarregar', () => {
    sessionStorage.setItem('zappi.sessao', JSON.stringify({ token: 'token-de-teste', nome: 'Lídia' }))

    abrirPedidos()

    expect(screen.getByRole('heading', { name: 'Pedidos' })).toBeVisible()
  })

  test('com a sessão salva corrompida, manda para o login', () => {
    sessionStorage.setItem('zappi.sessao', '{quebrado')

    abrirPedidos()

    expect(screen.getByRole('heading', { name: 'Login' })).toBeVisible()
  })
})
