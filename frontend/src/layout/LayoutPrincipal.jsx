import { AppShell, Button, Group, NavLink, Stack, Text, Title, UnstyledButton } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { IconLogout } from '@tabler/icons-react'
import { NavLink as LinkRota, Outlet, useLocation } from 'react-router'
import { useAutenticacao } from '../autenticacao/AutenticacaoContexto'
import { itensMenu } from './menu'
import classes from './LayoutPrincipal.module.css'

// Painel da Lídia. No computador, o menu fica na lateral; no celular,
// vira uma barra fixa embaixo, com botões grandes e sempre à mão.
export function LayoutPrincipal() {
  const { sair } = useAutenticacao()
  const { pathname } = useLocation()
  const telaGrande = useMediaQuery('(min-width: 48em)', false, { getInitialValueInEffect: false })

  const ativo = (caminho) => pathname.startsWith(caminho)

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 280, breakpoint: 'sm', collapsed: { mobile: true } }}
      footer={{ height: 76, collapsed: telaGrande }}
      padding="md"
    >
      <a href="#conteudo" className={classes.pularParaConteudo}>
        Pular para o conteúdo
      </a>

      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Title order={1} size="h2" c="zappi.7">
            Zappi
          </Title>
          <Button variant="outline" leftSection={<IconLogout size={22} aria-hidden />} onClick={sair}>
            Sair
          </Button>
        </Group>
      </AppShell.Header>

      {/* Só um dos dois menus existe por vez, para o teclado e o leitor de
          tela não passarem por um menu escondido. */}
      {telaGrande && (
      <AppShell.Navbar p="md" component="nav" aria-label="Menu principal">
        <Stack gap="xs">
          {itensMenu.map(({ caminho, rotulo, Icone }) => (
            <NavLink
              key={caminho}
              component={LinkRota}
              to={caminho}
              label={<Text fw={600}>{rotulo}</Text>}
              leftSection={<Icone size={26} aria-hidden />}
              active={ativo(caminho)}
              variant="filled"
            />
          ))}
        </Stack>
      </AppShell.Navbar>
      )}

      <AppShell.Main id="conteudo" tabIndex={-1}>
        <Outlet />
      </AppShell.Main>

      {!telaGrande && (
      <AppShell.Footer component="nav" aria-label="Menu principal">
        <div className={classes.barraInferior}>
          {itensMenu.map(({ caminho, rotulo, Icone }) => (
            <UnstyledButton
              key={caminho}
              component={LinkRota}
              to={caminho}
              className={classes.botaoBarra}
              data-ativo={ativo(caminho) || undefined}
            >
              <Icone size={28} aria-hidden />
              <span>{rotulo}</span>
            </UnstyledButton>
          ))}
        </div>
      </AppShell.Footer>
      )}
    </AppShell>
  )
}
