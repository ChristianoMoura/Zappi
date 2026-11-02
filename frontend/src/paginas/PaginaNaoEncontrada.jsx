import { Button, Center, Stack, Text, Title } from '@mantine/core'
import { Link } from 'react-router'
import { useTituloPagina } from './useTituloPagina'

export function PaginaNaoEncontrada() {
  useTituloPagina('Página não encontrada')

  return (
    <Center component="main" mih="100dvh" p="md">
      <Stack align="center" ta="center">
        <Title order={1}>Página não encontrada</Title>
        <Text>O endereço digitado não existe.</Text>
        <Button component={Link} to="/pedidos">
          Voltar para os pedidos
        </Button>
      </Stack>
    </Center>
  )
}
