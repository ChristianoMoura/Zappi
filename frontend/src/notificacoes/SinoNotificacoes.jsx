import { Loader, Menu, NavLink, ScrollArea, Text, UnstyledButton } from '@mantine/core'
import { IconAlertCircle, IconBell, IconRefresh } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { buscarNotificacoes, haQuantoTempo, marcarVistas, nomeDoSino, textoContador } from './servicoNotificacoes'
import classes from './Notificacoes.module.css'

// Sino de notificações (ZAP-172, ZAP-175). `variante`: "lateral" (menu aberto no computador, com o
// nome), "recolhido" (só o sino) ou "topo" (celular, ao lado da conta). A caixinha segue o menu da
// conta: abre ao clicar, Esc fecha e o foco volta ao sino. Ao abrir, as notificações viram vistas e
// o contador zera, mas as que eram novas continuam com o selo "Nova" até fechar. `classeItem` é a
// classe dos itens do menu lateral, para o sino ficar igual a eles.
export function SinoNotificacoes({ variante, quantidade, aoVer, classeItem }) {
  const navegar = useNavigate()
  const [estado, setEstado] = useState({ carregando: true, erro: false, lista: [] })
  const nome = nomeDoSino(quantidade)

  async function carregar() {
    setEstado({ carregando: true, erro: false, lista: [] })
    try {
      const lista = await buscarNotificacoes()
      setEstado({ carregando: false, erro: false, lista })
      aoVer()
      // Se falhar, continuam não vistas e voltam a contar no próximo minuto
      marcarVistas(lista.filter((n) => !n.vista).map((n) => n.id)).catch(() => {})
    } catch {
      setEstado({ carregando: false, erro: true, lista: [] })
    }
  }

  // Abre os detalhes do pedido no quadro (o quadro lê `abrir` ao carregar)
  const abrirPedido = (numero) => navegar('/pedidos', { state: { abrir: numero } })

  const contador = quantidade > 0 && (
    <span className={classes.contador} aria-hidden="true">
      {textoContador(quantidade)}
    </span>
  )
  const sino = (
    <span className={classes.sino}>
      <IconBell size={variante === 'topo' ? 28 : 26} stroke={variante === 'topo' ? 1.8 : 2} aria-hidden />
      {variante !== 'lateral' && contador}
    </span>
  )

  const alvo = {
    topo: (
      <UnstyledButton className={classes.botaoTopo} aria-label={nome} title="Notificações" data-onda>
        {sino}
      </UnstyledButton>
    ),
    recolhido: (
      <NavLink component="button" type="button" aria-label={nome} title="Notificações" leftSection={sino} className={classeItem} data-recolhido />
    ),
    lateral: (
      <NavLink
        component="button"
        type="button"
        aria-label={nome}
        label={<Text fw={600}>Notificações</Text>}
        leftSection={sino}
        rightSection={contador}
        className={classeItem}
      />
    ),
  }[variante]

  return (
    <Menu
      position={variante === 'topo' ? 'bottom-end' : 'right-start'}
      offset={variante === 'topo' ? 8 : 10}
      width={340}
      shadow="md"
      radius="md"
      returnFocus
      onOpen={carregar}
      classNames={{ dropdown: classes.caixinha }}
    >
      <Menu.Target>{alvo}</Menu.Target>
      <Menu.Dropdown aria-label="Notificações">
        <Menu.Label className={classes.titulo}>Notificações</Menu.Label>
        {estado.carregando && (
          <div className={classes.estado} role="status">
            <Loader size="sm" type="dots" color="zappi" aria-hidden />
            Carregando as notificações…
          </div>
        )}
        {estado.erro && (
          <>
            <p className={`${classes.estado} ${classes.erro}`} role="alert">
              <IconAlertCircle size={22} aria-hidden />
              Não foi possível carregar as notificações agora.
            </p>
            <Menu.Item closeMenuOnClick={false} onClick={carregar} leftSection={<IconRefresh size={20} aria-hidden />} className={classes.tentarDeNovo}>
              Tentar de novo
            </Menu.Item>
          </>
        )}
        {!estado.carregando && !estado.erro && estado.lista.length === 0 && <p className={classes.estado}>Nenhuma notificação por enquanto.</p>}
        {estado.lista.length > 0 && (
          <ScrollArea.Autosize mah={380} type="auto">
            {estado.lista.map((notificacao) => (
              <Menu.Item key={notificacao.id} onClick={() => abrirPedido(notificacao.numeroPedido)} className={classes.item} data-nova={!notificacao.vista || undefined}>
                <span className={classes.texto}>
                  {!notificacao.vista && <span className={classes.nova}>Nova</span>}
                  {notificacao.texto}
                </span>
                <span className={classes.quando}>{haQuantoTempo(notificacao.criadoEm)}</span>
              </Menu.Item>
            ))}
          </ScrollArea.Autosize>
        )}
      </Menu.Dropdown>
    </Menu>
  )
}
