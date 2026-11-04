import { MantineProvider } from '@mantine/core'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AutenticacaoProvider } from '../autenticacao/AutenticacaoContexto'
import { tema } from '../tema'

// Monta as rotas com o tema e a autenticação, como em main.jsx, começando em `caminho`
export function renderizarComRotas(rotas, caminho) {
  const roteador = createMemoryRouter(rotas, { initialEntries: [caminho] })
  render(
    <MantineProvider theme={tema} env="test">
      <AutenticacaoProvider>
        <RouterProvider router={roteador} />
      </AutenticacaoProvider>
    </MantineProvider>,
  )
  return roteador
}
