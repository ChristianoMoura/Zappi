import { ActionIcon, AppShell, Group, Menu, NavLink, Stack, Text, UnstyledButton } from '@mantine/core'
import { useLocalStorage, useMediaQuery } from '@mantine/hooks'
import { IconChevronDown, IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand, IconLogout, IconUserCircle } from '@tabler/icons-react'
import { useState } from 'react'
// Na barra de baixo, Link comum: Produtos também fica ativo em Categorias, e quem marca é a tela
import { Link, NavLink as LinkRota, Outlet, useLocation } from 'react-router'
import nome from '../assets/zappi-nome-creme.svg'
import simbolo from '../assets/zappi-simbolo-creme.svg'
import { useAutenticacao } from '../autenticacao/AutenticacaoContexto'
import { iniciaisDaLoja, useMarcaLoja } from '../estabelecimento/useMarcaLoja'
import { caminhosDoItem, itensMenu } from './menu'
import { useOndaAoClicar } from './useOndaAoClicar'
import classes from './LayoutPrincipal.module.css'

// Painel da Lídia. No computador, o menu fica na lateral e pode ser recolhido, ficando
// só com os ícones; no celular, vira uma barra fixa embaixo, com botões grandes.
export function LayoutPrincipal() {
  const { nome: nomeUsuaria, sair } = useAutenticacao()
  const { pathname } = useLocation()
  const telaGrande = useMediaQuery('(min-width: 48em)', false, { getInitialValueInEffect: false })
  const [recolhido, setRecolhido] = useLocalStorage({ key: 'zappi.menu-recolhido', defaultValue: false })
  const marca = useMarcaLoja()
  useOndaAoClicar()

  const ativo = (caminho) => pathname.startsWith(caminho)
  const textoBotaoMenu = recolhido ? 'Abrir menu' : 'Recolher menu'

  // Grupos do menu lateral: ficam abertos quando a Lídia está numa das páginas deles, e ela pode
  // fechar e abrir pela seta (ZAP-139). A escolha dela vale até mudar de página.
  const [escolhaGrupo, setEscolhaGrupo] = useState({})
  const grupoAberto = (item) => {
    const escolha = escolhaGrupo[item.rotulo]
    return escolha?.caminho === pathname ? escolha.aberto : caminhosDoItem(item).some(ativo)
  }
  const abrirGrupo = (item, aberto) => setEscolhaGrupo((atual) => ({ ...atual, [item.rotulo]: { aberto, caminho: pathname } }))

  return (
    <AppShell
      header={{ height: 68 }}
      navbar={{ width: recolhido ? 84 : 280, breakpoint: 'sm', collapsed: { mobile: true } }}
      footer={{ height: 76, collapsed: telaGrande }}
      padding="md"
      transitionDuration={280}
    >
      <a href="#conteudo" className={classes.pularParaConteudo}>
        Pular para o conteúdo
      </a>

      <AppShell.Header className={classes.topo}>
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
            {/* Collab Casa Belt × Zappi: nome e logo vêm do Meu estabelecimento */}
            {marca && (
              <>
                {marca.logo ? (
                  <img src={marca.logo} alt="" className={classes.seloLoja} />
                ) : (
                  <span className={classes.seloLoja} aria-hidden="true">{iniciaisDaLoja(marca.nome)}</span>
                )}
                <span className={classes.nomeLoja}>{marca.nome}</span>
                <span className={classes.vezes} aria-hidden="true">×</span>
              </>
            )}
            <span className={classes.marcaZappi}>
              <img src={simbolo} alt="" className={classes.marcaSimbolo} />
              <img src={nome} alt="Zappi" className={classes.marcaNome} />
            </span>
          </div>
          {/* Conta no canto superior direito, como na Referência A: o "Sair" fica no menu */}
          <Menu position="bottom-end" width={240} shadow="md" radius="md">
            <Menu.Target>
              <UnstyledButton className={classes.botaoConta} aria-label="Minha conta" data-onda>
                <IconUserCircle size={38} stroke={1.5} aria-hidden />
                <IconChevronDown size={18} stroke={2.5} aria-hidden className={classes.setaConta} />
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              {nomeUsuaria ? <Menu.Label className={classes.nomeConta}>{nomeUsuaria}</Menu.Label> : null}
              <Menu.Item leftSection={<IconLogout size={22} aria-hidden />} onClick={sair} className={classes.itemConta}>
                Sair
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      {/* Só um dos dois menus existe por vez, para o teclado e o leitor de
          tela não passarem por um menu escondido. */}
      {telaGrande && (
      <AppShell.Navbar p={recolhido ? 'xs' : 'md'} component="nav" id="menu-principal" aria-label="Menu principal" className={`${classes.menuLateral} ${classes.moldura}`}>
        <Stack gap="xs">
          {itensMenu.map((item) =>
            item.filhos ? (
              <GrupoMenu key={item.rotulo} item={item} recolhido={recolhido} ativo={ativo} aberto={grupoAberto(item)} aoAbrir={(valor) => abrirGrupo(item, valor)} />
            ) : (
              <NavLink
                key={item.caminho}
                component={LinkRota}
                to={item.caminho}
                label={recolhido ? undefined : <Text fw={600}>{item.rotulo}</Text>}
                aria-label={recolhido ? item.rotulo : undefined}
                title={recolhido ? item.rotulo : undefined}
                leftSection={<item.Icone size={26} aria-hidden />}
                active={ativo(item.caminho)}
                variant="filled"
                className={classes.itemMenu}
                data-recolhido={recolhido || undefined}
              />
            ),
          )}
        </Stack>
      </AppShell.Navbar>
      )}

      <AppShell.Main id="conteudo" tabIndex={-1} className={classes.principal}>
        <Outlet />
      </AppShell.Main>

      {!telaGrande && (
      <AppShell.Footer component="nav" aria-label="Menu principal" className={classes.moldura}>
        <div className={classes.barraInferior}>
          {itensMenu.map((item) => (
            <UnstyledButton
              key={item.caminho}
              component={Link}
              to={item.caminho}
              className={classes.botaoBarra}
              data-ativo={caminhosDoItem(item).some(ativo) || undefined}
              aria-current={caminhosDoItem(item).some(ativo) ? 'page' : undefined}
              data-onda
            >
              <item.Icone size={28} aria-hidden />
              <span>{item.rotulo}</span>
            </UnstyledButton>
          ))}
        </div>
      </AppShell.Footer>
      )}
    </AppShell>
  )
}

// Grupo do menu lateral (ZAP-139). Aberto: o nome com uma seta abre e fecha a lista dos filhos,
// recuados, como na referência aprovada. Recolhido: o ícone abre uma lista flutuante com os
// filhos, porque não há espaço para mostrá-los.
function GrupoMenu({ item, recolhido, ativo, aberto, aoAbrir }) {
  const naPagina = caminhosDoItem(item).some(ativo)
  const filhos = item.filhos.map((filho) => ({ ...filho, atual: ativo(filho.caminho) }))

  if (recolhido) {
    return (
      <Menu position="right-start" offset={10} width={220} shadow="md" radius="md">
        <Menu.Target>
          <NavLink
            component="button"
            type="button"
            aria-label={item.rotulo}
            title={item.rotulo}
            leftSection={<item.Icone size={26} aria-hidden />}
            active={naPagina}
            variant="filled"
            className={classes.itemMenu}
            data-recolhido
          />
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>{item.rotulo}</Menu.Label>
          {filhos.map((filho) => (
            <Menu.Item
              key={filho.caminho}
              component={LinkRota}
              to={filho.caminho}
              leftSection={<filho.Icone size={22} aria-hidden />}
              aria-current={filho.atual ? 'page' : undefined}
              className={classes.itemFlutuante}
              data-atual={filho.atual || undefined}
            >
              {filho.rotulo}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    )
  }

  return (
    <NavLink
      component="button"
      type="button"
      label={<Text fw={600}>{item.rotulo}</Text>}
      leftSection={<item.Icone size={26} aria-hidden />}
      opened={aberto}
      onChange={aoAbrir}
      aria-expanded={aberto}
      childrenOffset={26}
      className={`${classes.itemMenu} ${classes.grupoMenu}`}
      data-na-pagina={naPagina || undefined}
    >
      {filhos.map((filho) => (
        <NavLink
          key={filho.caminho}
          component={LinkRota}
          to={filho.caminho}
          label={filho.rotulo}
          leftSection={<filho.Icone size={22} aria-hidden />}
          active={filho.atual}
          aria-current={filho.atual ? 'page' : undefined}
          variant="light"
          className={classes.subitemMenu}
        />
      ))}
    </NavLink>
  )
}
