import { Alert, Button, Loader, Switch, Tabs } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { IconAlertCircle, IconCheck, IconPlus } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { CartaoPedido } from '../pedidos/CartaoPedido'
import { DetalhesPedido } from '../pedidos/DetalhesPedido'
import { colunasVisiveis, pedidosDaColuna, STATUS } from '../pedidos/regrasPedidos'
import { avancarPedido, buscarPedidos, confirmarPedido, marcarMensagemEnviada, recusarPedido, voltarPedido } from '../pedidos/servicoPedidos'
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
  const [enviando, setEnviando] = useState(false)
  const { state } = useLocation()
  // Voltando da edição (ZAP-91), o painel do pedido abre de novo; depois de salvar, com o aviso
  const [acabouDe, setAcabouDe] = useState(state?.editado ? 'editar' : null)
  const [erroAcao, setErroAcao] = useState('')
  const origemFoco = useRef(null)
  const abrirAoVoltar = state?.abrir

  // Voltando do cadastro de pedido (ZAP-89): avisa e leva o foco ao card novo, na coluna Novo.
  // Voltando sem salvar, o foco volta para o botão "Novo pedido".
  const novo = state?.novo
  const focoAoVoltar = state?.foco
  const [aviso, setAviso] = useState(() => (novo ? `Pedido #${novo.numero} de ${novo.cliente} cadastrado na coluna Novo.` : null))

  useEffect(() => {
    let ativo = true
    buscarPedidos()
      .then((resposta) => {
        if (!ativo) return
        setPedidos(resposta)
        const pedido = resposta.find((p) => p.numero === abrirAoVoltar)
        if (pedido) {
          setAberto(pedido)
          setAbaAtiva(String(pedido.status))
        }
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
  }, [abrirAoVoltar])

  useEffect(() => {
    if (carregando || (!novo && !focoAoVoltar)) return
    const alvo = novo ? document.querySelector(`[data-numero-pedido="${novo.numero}"]`) : document.getElementById(focoAoVoltar)
    alvo?.focus()
    alvo?.scrollIntoView?.({ block: 'center' })
  }, [carregando, novo, focoAoVoltar])

  useEffect(() => {
    if (!aviso) return undefined
    const tempo = setTimeout(() => setAviso(null), 4000)
    return () => clearTimeout(tempo)
  }, [aviso])

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
        Não foi possível carregar os pedidos agora. Tente novamente em alguns minutos.
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
    setAcabouDe(null)
    setErroAcao('')
    setAberto(pedido)
  }

  function fechar() {
    setAberto(null)
    setAcabouDe(null)
    setErroAcao('')
    // Depois de confirmar ou recusar, o card mudou de coluna: o foco volta para ele no lugar novo
    const numero = aberto?.numero
    const cartao = numero && document.querySelector(`[data-numero-pedido="${numero}"]`)
    ;(cartao ?? origemFoco.current)?.focus()
  }

  function atualizar(pedido) {
    setPedidos((atuais) => atuais.map((p) => (p.numero === pedido.numero ? pedido : p)))
    setAberto(pedido)
  }

  // Executa uma ação sobre o pedido aberto. No celular, a aba acompanha o pedido para a coluna
  // nova. Devolve se deu certo, para as janelas de confirmação fecharem só nesse caso.
  async function agir(acao, chamada, oQueFazer) {
    setEnviando(true)
    setErroAcao('')
    try {
      const pedido = await chamada()
      atualizar(pedido)
      setAcabouDe(acao)
      if (pedido.status === STATUS.RECUSADO) setMostrarRecusados(true)
      if (!telaGrande) setAbaAtiva(String(pedido.status))
      return true
    } catch {
      setErroAcao(`Não foi possível ${oQueFazer} agora. Tente novamente em alguns minutos.`)
      return false
    } finally {
      setEnviando(false)
    }
  }

  const confirmar = (pedido) => agir('confirmar', () => confirmarPedido(pedido.numero), 'confirmar o pedido')

  // Recusar (Novo) e cancelar (Confirmado ou Em produção) levam o pedido para Recusado. O filtro
  // "Mostrar recusados" liga sozinho, para a Lídia continuar vendo o pedido e enviar a mensagem.
  function recusar(pedido, motivo) {
    const acao = pedido.status === STATUS.NOVO ? 'recusar' : 'cancelar'
    return agir(acao, () => recusarPedido(pedido.numero, motivo), `${acao} o pedido`)
  }

  // "Iniciar produção" e "Marcar como pronto" (ZAP-77)
  function avancar(pedido) {
    const pronto = pedido.status === STATUS.EM_PRODUCAO
    return agir(pronto ? 'pronto' : 'iniciar', () => avancarPedido(pedido.numero), pronto ? 'marcar o pedido como pronto' : 'iniciar a produção')
  }

  const voltar = (pedido) => agir('voltar', () => voltarPedido(pedido.numero), 'voltar o pedido')

  // O link do WhatsApp abre na hora; marcar como enviada acontece em seguida
  async function enviarMensagem(indice) {
    try {
      atualizar(await marcarMensagemEnviada(aberto.numero, indice))
    } catch {
      setErroAcao('A mensagem foi aberta no WhatsApp, mas não deu para marcar como enviada. Tente novamente.')
    }
  }

  return (
    <div className={classes.pagina}>
      <div className={classes.cabecalho}>
        <div>
          <h1 className={classes.titulo}>Pedidos</h1>
          <p className={classes.subtitulo}>Acompanhe suas encomendas.</p>
        </div>
        <div className={classes.acoesTopo}>
          <Switch
            id="mostrar-recusados"
            label="Mostrar recusados"
            size="lg"
            checked={mostrarRecusados}
            onChange={(evento) => mudarFiltro(evento.currentTarget.checked)}
            classNames={{ label: classes.rotuloFiltro }}
          />
          <Button component={Link} to="/pedidos/novo" id="novo-pedido" size="lg" leftSection={<IconPlus size={22} aria-hidden />} className={classes.novoPedido}>
            Novo pedido
          </Button>
        </div>
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

      <DetalhesPedido
        pedido={aberto}
        aberto={aberto !== null}
        aoFechar={fechar}
        telaGrande={telaGrande}
        aoConfirmar={confirmar}
        aoRecusar={recusar}
        aoAvancar={avancar}
        aoVoltar={voltar}
        aoEnviarMensagem={enviarMensagem}
        enviando={enviando}
        acabouDe={acabouDe}
        erroAcao={erroAcao}
      />

      {aviso && (
        <div className={classes.aviso} role="status">
          <IconCheck size={20} aria-hidden />
          {aviso}
        </div>
      )}
    </div>
  )
}
