import { Alert, Loader, Switch, Tabs } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { IconAlertCircle } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { CartaoPedido } from '../pedidos/CartaoPedido'
import { DetalhesPedido } from '../pedidos/DetalhesPedido'
import { colunasVisiveis, pedidosDaColuna, STATUS } from '../pedidos/regrasPedidos'
import { buscarPedidos } from '../pedidos/servicoPedidos'
import classes from '../pedidos/QuadroPedidos.module.css'
import { useTituloPagina } from './useTituloPagina'

function ListaDaColuna({ coluna, pedidos, semPedidos, aoAbrir }) {
  if (pedidos.length === 0) {
    return (
      <p className={classes.vazio}>
        {semPedidos && coluna.status === STATUS.NOVO ? 'Nenhum pedido novo por enquanto. Quando chegar um pedido, ele aparece aqui.' : 'Nenhum pedido aqui.'}
      </p>
    )
  }
  return pedidos.map((pedido) => <CartaoPedido key={pedido.numero} pedido={pedido} aoAbrir={aoAbrir} />)
}

// Quadro de pedidos (US4, RF07, RF08): no computador, uma coluna por status; no celular,
// uma aba por coluna. Os recusados ficam escondidos até ligar "Mostrar recusados" (RN04).
export function PaginaPedidos() {
  useTituloPagina('Pedidos')
  const telaGrande = useMediaQuery('(min-width: 48em)', false, { getInitialValueInEffect: false })
  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erroCarregar, setErroCarregar] = useState(false)
  const [mostrarRecusados, setMostrarRecusados] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState(String(STATUS.NOVO))
  const [aberto, setAberto] = useState(null)
  const origemFoco = useRef(null)

  useEffect(() => {
    let ativo = true
    buscarPedidos()
      .then((resposta) => {
        if (ativo) setPedidos(resposta)
      })
      .catch(() => {
        if (ativo) setErroCarregar(true)
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [])

  if (carregando) {
    return (
      <div className={classes.estado} role="status">
        <Loader color="zappi" type="dots" />
        Carregando os pedidos…
      </div>
    )
  }

  if (erroCarregar) {
    return (
      <Alert color="#b42318" variant="outline" icon={<IconAlertCircle size={22} aria-hidden />} className={classes.erroCarregar}>
        Não foi possível carregar os pedidos agora. Tente de novo em alguns minutos.
      </Alert>
    )
  }

  const colunas = colunasVisiveis(mostrarRecusados)
  const semPedidos = pedidos.length === 0

  function mudarFiltro(ligado) {
    setMostrarRecusados(ligado)
    // No celular, ligar o filtro já mostra a aba dos recusados; desligar volta para Novo
    if (!telaGrande) setAbaAtiva(String(ligado ? STATUS.RECUSADO : STATUS.NOVO))
    else if (!ligado && abaAtiva === String(STATUS.RECUSADO)) setAbaAtiva(String(STATUS.NOVO))
  }

  function abrir(pedido, origem) {
    origemFoco.current = origem
    setAberto(pedido)
  }

  function fechar() {
    setAberto(null)
    origemFoco.current?.focus()
  }

  return (
    <div className={classes.pagina}>
      <div className={classes.cabecalho}>
        <div>
          <h1 className={classes.titulo}>Pedidos</h1>
          <p className={classes.subtitulo}>Acompanhe suas encomendas.</p>
        </div>
        <Switch
          id="mostrar-recusados"
          label="Mostrar recusados"
          size="lg"
          checked={mostrarRecusados}
          onChange={(evento) => mudarFiltro(evento.currentTarget.checked)}
          classNames={{ label: classes.rotuloFiltro }}
        />
      </div>

      {telaGrande ? (
        <div className={classes.quadro} style={{ '--colunas': colunas.length }}>
          {colunas.map((coluna) => {
            const daColuna = pedidosDaColuna(pedidos, coluna.status)
            return (
              <section key={coluna.status} className={classes.coluna} data-recusado={coluna.status === STATUS.RECUSADO || undefined} aria-labelledby={`coluna-${coluna.status}`}>
                <h2 id={`coluna-${coluna.status}`} className={classes.tituloColuna}>
                  <span className={classes.ponto} style={{ background: coluna.cor }} aria-hidden />
                  {coluna.nome}
                  <span className={classes.contagem} aria-label={`${daColuna.length} ${daColuna.length === 1 ? 'pedido' : 'pedidos'}`}>
                    {daColuna.length}
                  </span>
                </h2>
                <ListaDaColuna coluna={coluna} pedidos={daColuna} semPedidos={semPedidos} aoAbrir={abrir} />
              </section>
            )
          })}
        </div>
      ) : (
        <Tabs value={abaAtiva} onChange={(valor) => valor && setAbaAtiva(valor)} variant="unstyled" classNames={{ list: classes.abas, tab: classes.aba, panel: classes.painelAba }}>
          <Tabs.List aria-label="Colunas do quadro">
            {colunas.map((coluna) => (
              <Tabs.Tab key={coluna.status} value={String(coluna.status)} data-recusado={coluna.status === STATUS.RECUSADO || undefined}>
                {coluna.nome} {pedidosDaColuna(pedidos, coluna.status).length}
              </Tabs.Tab>
            ))}
          </Tabs.List>
          {colunas.map((coluna) => (
            <Tabs.Panel key={coluna.status} value={String(coluna.status)}>
              <ListaDaColuna coluna={coluna} pedidos={pedidosDaColuna(pedidos, coluna.status)} semPedidos={semPedidos} aoAbrir={abrir} />
            </Tabs.Panel>
          ))}
        </Tabs>
      )}

      <DetalhesPedido pedido={aberto} aberto={aberto !== null} aoFechar={fechar} telaGrande={telaGrande} />
    </div>
  )
}
