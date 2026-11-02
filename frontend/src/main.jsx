import '@mantine/core/styles.css'
import './estilos.css'

import { MantineProvider } from '@mantine/core'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { AutenticacaoProvider } from './autenticacao/AutenticacaoContexto'
import { rotas } from './rotas/rotas'
import { resolverVariaveis, tema } from './tema'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MantineProvider theme={tema} cssVariablesResolver={resolverVariaveis} forceColorScheme="light">
      <AutenticacaoProvider>
        <RouterProvider router={rotas} />
      </AutenticacaoProvider>
    </MantineProvider>
  </StrictMode>,
)
