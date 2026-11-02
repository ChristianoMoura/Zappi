import { Button, Center, Paper, Stack, Text, Title } from '@mantine/core'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { useAutenticacao } from '../autenticacao/AutenticacaoContexto'
import { useTituloPagina } from './useTituloPagina'

// PROVISÓRIA: o formulário de e-mail e senha é feito na ZAP-16.
export function PaginaLogin() {
  useTituloPagina('Entrar')
  const { autenticado, entrar } = useAutenticacao()
  const navegar = useNavigate()
  const { state } = useLocation()
  const destino = state?.voltarPara ?? '/pedidos'

  if (autenticado) {
    return <Navigate to={destino} replace />
  }

  function entrarSemSenha() {
    entrar()
    navegar(destino, { replace: true })
  }

  return (
    <Center mih="100dvh" p="md">
      <Paper component="main" withBorder shadow="sm" p="xl" w="100%" maw={420}>
        <Stack>
          <Title order={1} c="zappi.7">
            Zappi
          </Title>
          <Text>Entre para ver seus pedidos.</Text>
          <Text c="dimmed">A tela de login será feita na ZAP-16.</Text>

          {import.meta.env.DEV && (
            <>
              <Button onClick={entrarSemSenha} fullWidth>
                Entrar sem senha
              </Button>
              <Text size="sm" c="dimmed" ta="center">
                Botão provisório, só aparece no desenvolvimento.
              </Text>
            </>
          )}
        </Stack>
      </Paper>
    </Center>
  )
}
