import { ActionIcon, AppShell, Button, Group, NavLink, Stack, Text, UnstyledButton } from '@mantine/core'
import { useLocalStorage, useMediaQuery } from '@mantine/hooks'
import { IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand, IconLogout } from '@tabler/icons-react'
import { NavLink as LinkRota, Outlet, useLocation } from 'react-router'
import nome from '../assets/zappi-nome.svg'
import simbolo from '../assets/zappi-simbolo.svg'
import { useAutenticacao } from '../autenticacao/AutenticacaoContexto'
import { itensMenu } from './menu'
import { useOndaAoClicar } from './useOndaAoClicar'
import classes from './LayoutPrincipal.module.css'

// Painel da Lídia. No computador, o menu fica na lateral e pode ser recolhido, ficando
// só com os ícones; no celular, vira uma barra fixa embaixo, com botões grandes.
export function LayoutPrincipal() {
  const { sair } = useAutenticacao()
  const { pathname } = useLocation()
  const telaGrande = useMediaQuery('(min-width: 48em)', false, { getInitialValueInEffect: false })
  const [recolhido, setRecolhido] = useLocalStorage({ key: 'zappi.menu-recolhido', defaultValue: false })
  useOndaAoClicar()

  const ativo = (caminho) => pathname.startsWith(caminho)
  const textoBotaoMenu = recolhido ? 'Abrir menu' : 'Recolher menu'

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: recolhido ? 84 : 280, breakpoint: 'sm', collapsed: { mobile: true } }}
      footer={{ height: 76, collapsed: telaGrande }}
      padding="md"
      transitionDuration={280}
    >
      <a href="#conteudo" className={classes.pularParaConteudo}>
        Pular para o conteúdo
      </a>

      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <div className={classes.marca}>
            {telaGrande && (
              <ActionIcon
                variant="subtle"
                size={44}
                radius="md"
                onClick={() => setRecolhido((v) => !v)}
                aria-expanded={!recolhido}
                aria-controls="menu-principal"
                aria-label={textoBotaoMenu}
                title={textoBotaoMenu}
                className={classes.botaoMenu}
              >
                {recolhido ? <IconLayoutSidebarLeftExpand size={24} aria-hidden /> : <IconLayoutSidebarLeftCollapse size={24} aria-hidden />}
              </ActionIcon>
            )}
            <img src={simbolo} alt="" className={classes.marcaSimbolo} />
            <img src={nome} alt="Zappi" className={classes.marcaNome} />
          </div>
          <Button variant="outline" leftSection={<IconLogout size={22} aria-hidden />} onClick={sair}>
            Sair
          </Button>
        </Group>
      </AppShell.Header>

      {/* Só um dos dois menus existe por vez, para o teclado e o leitor de
          tela não passarem por um menu escondido. */}
      {telaGrande && (
      <AppShell.Navbar p={recolhido ? 'xs' : 'md'} component="nav" id="menu-principal" aria-label="Menu principal" className={classes.menuLateral}>
        <Stack gap="xs">
          {itensMenu.map(({ caminho, rotulo, Icone }) => (
            <NavLink
              key={caminho}
              component={LinkRota}
              to={caminho}
              label={recolhido ? undefined : <Text fw={600}>{rotulo}</Text>}
              aria-label={recolhido ? rotulo : undefined}
              title={recolhido ? rotulo : undefined}
              leftSection={<Icone size={26} aria-hidden />}
              active={ativo(caminho)}
              variant="filled"
              className={classes.itemMenu}
              data-recolhido={recolhido || undefined}
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
              data-onda
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
