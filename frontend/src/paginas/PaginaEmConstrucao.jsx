import { Stack, Text, Title } from '@mantine/core'
import { useTituloPagina } from './useTituloPagina'

// Base provisória das telas, até cada história criar a sua
export function PaginaEmConstrucao({ titulo, descricao }) {
  useTituloPagina(titulo)

  return (
    <Stack gap="sm">
      <Title order={2} size="h1">
        {titulo}
      </Title>
      <Text c="dimmed">{descricao}</Text>
    </Stack>
  )
}
