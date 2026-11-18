import { Alert, Button, Loader, NativeSelect, Tabs } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { IconAlertCircle, IconCheck, IconPlus } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { CartaoPedido } from '../pedidos/CartaoPedido'
import { DetalhesPedido } from '../pedidos/DetalhesPedido'
import { COLUNAS, colunasVisiveis, OCULTOS_EM_TODOS, pedidosDaColuna, STATUS, statusDoFiltro } from '../pedidos/regrasPedidos'
import { AcaoNaoPermitidaError, anonimizarCliente, avancarPedido, buscarPedidos, confirmarPedido, marcarMensagemEnviada, recusarPedido, voltarPedido } from '../pedidos/servicoPedidos'
import classes from '../pedidos/QuadroPedidos.module.css'
import { useTituloPagina } from './useTituloPagina'

// `rolavel`: no computador, os cards ficam numa área com rolagem própria (ZAP-165), que recebe o
// foco pelo Tab para rolar com as setas, com o nome da coluna como rótulo (NBR 17225 5.1.1)
function ListaDaColuna({ coluna, pedidos, semPedidos, aoAbrir, rolavel = false, grade = false }) {
  if (pedidos.length === 0) {
    return (
      <p className={classes.vazio}>
        {semPedidos && coluna.status === STATUS.NOVO ? 'Nenhum pedido novo por enquanto. Quando chegar um pedido, ele aparece aqui.' : 'Nenhum pedido aqui.'}
      </p>
    )
  }
  const cartoes = pedidos.map((pedido) => <CartaoPedido key={pedido.numero} pedido={pedido} aoAbrir={aoAbrir} />)
  if (!rolavel) return cartoes
  return (
    <div role="group" tabIndex={0} className={`${classes.cartoes} ${grade ? classes.gradeFiltro : ''}`} aria-label={`Pedidos da coluna ${coluna.nome}, ${quantidadeDePedidos(pedidos.length)}`}>
      {cartoes}
    </div>
  )
}

const quantidadeDePedidos = (n) => `${n} ${n === 1 ? 'pedido' : 'pedidos'}`

// O card aparece dentro da sua coluna (que rola sozinha no computador) e recebe o foco
function focarCartao(cartao, bloco = 'nearest') {
  cartao?.scrollIntoView?.({ block: bloco })
  cartao?.focus({ preventScroll: true })
}

// Um status escolhido no filtro (ZAP-179): no computador, a coluna dele ocupa a largura da tela,
// com os cards em grade; no celular, a lista, sem as abas. Sem pedidos, o atalho "Ver todos".
function QuadroFiltrado({ coluna, pedidos, telaGrande, aoAbrir, aoVerTodos }) {
  return (
    <section
      className={`${classes.coluna} ${classes.colunaFiltrada}`}
      style={{ '--cor-coluna': coluna.cor }}
      data-recusado={coluna.status === STATUS.RECUSADO || undefined}
      aria-labelledby={`coluna-${coluna.status}`}
    >
      <h2 id={`coluna-${coluna.status}`} className={classes.tituloColuna}>
        <span className={classes.ponto} style={{ background: coluna.cor }} aria-hidden />
        {coluna.nome}
        <span className={classes.contagem} aria-label={quantidadeDePedidos(pedidos.length)}>
          {pedidos.length}
        </span>
      </h2>
      {pedidos.length > 0 ? (
        <ListaDaColuna coluna={coluna} pedidos={pedidos} aoAbrir={aoAbrir} rolavel={telaGrande} grade={telaGrande} />
      ) : (
        <div className={classes.semResultado}>
          <p>Nenhum pedido em {coluna.nome}.</p>
          <Button variant="subtle" onClick={aoVerTodos}>
            Ver todos
          </Button>
        </div>
      )}
    </section>
  )
}

// Quadro de pedidos (US4, RF07, RF08): no computador, uma coluna por status; no celular,
// uma aba por coluna. A lista "Mostrar" (ZAP-179) filtra por status: em "Todos", Entregue e
// Recusado ficam ocultos (RN04); escolhendo um status, só os pedidos dele aparecem, em grade no
// computador e em lista no celular. O filtro fica no endereço (?status=3).
export function PaginaPedidos() {
  useTituloPagina('Pedidos')
  const telaGrande = useMediaQuery('(min-width: 48em)', false, { getInitialValueInEffect: false })
  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erroCarregar, setErroCarregar] = useState(false)
  const [parametros, setParametros] = useSearchParams()
  const filtro = statusDoFiltro(parametros.get('status'))
  const [anuncio, setAnuncio] = useState('')
  const [abaAtiva, setAbaAtiva] = useState(String(STATUS.NOVO))
  const [aberto, setAberto] = useState(null)
  const [enviando, setEnviando] = useState(false)
  // `key` muda a cada navegação: clicar numa notificação (ZAP-175) já estando no quadro recarrega
  // os pedidos e abre o pedido, mesmo que seja o mesmo de antes. Trocar o filtro (ZAP-179) também
  // navega, mas sem pedido para abrir, então não recarrega
  const { state, search, key: navegacao } = useLocation()
  // Voltando da edição (ZAP-91), o painel do pedido abre de novo; depois de salvar, com o aviso
  const [acabouDe, setAcabouDe] = useState(state?.editado ? 'editar' : null)
  const [erroAcao, setErroAcao] = useState('')
  const origemFoco = useRef(null)
  const abrirAoVoltar = state?.abrir
  const navegacaoParaAbrir = abrirAoVoltar ? navegacao : null

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
          // No celular, a aba acompanha o pedido, se a coluna dele aparece em "Todos"
          if (!OCULTOS_EM_TODOS.includes(pedido.status)) setAbaAtiva(String(pedido.status))
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
  }, [abrirAoVoltar, navegacaoParaAbrir])

  useEffect(() => {
    if (carregando || (!novo && !focoAoVoltar)) return
    const alvo = novo ? document.querySelector(`[data-numero-pedido="${novo.numero}"]`) : document.getElementById(focoAoVoltar)
    focarCartao(alvo, 'center')
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

  const colunas = colunasVisiveis(filtro)
  const semPedidos = pedidos.length === 0
  const colunaDoFiltro = filtro && colunas[0]

  // Troca o filtro no endereço e anuncia o resultado de forma discreta (NBR 17225 5.1.1)
  function mudarFiltro(valor) {
    const status = statusDoFiltro(valor)
    setParametros(status ? { status: String(status) } : {})
    if (status) {
      const coluna = COLUNAS.find((c) => c.status === status)
      setAnuncio(`Mostrando ${quantidadeDePedidos(pedidosDaColuna(pedidos, status).length)} em ${coluna.nome}.`)
    } else {
      setAnuncio('Mostrando todos os pedidos, menos os entregues e os recusados.')
      setAbaAtiva(String(STATUS.NOVO))
    }
  }

  function verTodos() {
    mudarFiltro('')
    document.getElementById('filtro-status')?.focus()
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
    // Se o pedido saiu do que está na tela (mudou para um status fora do filtro), o foco volta
    // para o filtro de status (ZAP-179)
    const cartao = numero && document.querySelector(`[data-numero-pedido="${numero}"]`)
    if (cartao) focarCartao(cartao)
    else document.getElementById('filtro-status')?.focus()
  }

  function atualizar(pedido) {
    setPedidos((atuais) => atuais.map((p) => (p.numero === pedido.numero ? pedido : p)))
    setAberto(pedido)
  }

  // Executa uma ação sobre o pedido aberto. No celular, a aba acompanha o pedido para a coluna
  // nova. Devolve se deu certo, para as janelas de confirmação fecharem só nesse caso. Com
  // `motivoDaApi`, a tela mostra o motivo que o backend deu para recusar a ação.
  async function agir(acao, chamada, oQueFazer, motivoDaApi = false) {
    setEnviando(true)
    setErroAcao('')
    try {
      const pedido = await chamada()
      atualizar(pedido)
      setAcabouDe(acao)
      // No celular, a aba acompanha o pedido, se a coluna dele estiver na tela
      if (!telaGrande && colunas.some((c) => c.status === pedido.status)) setAbaAtiva(String(pedido.status))
      return true
    } catch (erro) {
      const motivo = motivoDaApi && erro instanceof AcaoNaoPermitidaError && erro.message
      setErroAcao(motivo || `Não foi possível ${oQueFazer} agora. Tente novamente em alguns minutos.`)
      return false
    } finally {
      setEnviando(false)
    }
  }

  const confirmar = (pedido) => agir('confirmar', () => confirmarPedido(pedido.numero), 'confirmar o pedido')

  // Recusar (Novo) e cancelar (Confirmado ou Em produção) levam o pedido para Recusado. O filtro não
  // muda sozinho: o painel continua aberto, com o aviso de para onde o pedido foi.
  function recusar(pedido, motivo) {
    const acao = pedido.status === STATUS.NOVO ? 'recusar' : 'cancelar'
    return agir(acao, () => recusarPedido(pedido.numero, motivo), `${acao} o pedido`)
  }

  // "Iniciar produção" e "Marcar como pronto" (ZAP-77) e "Marcar como entregue" (ZAP-169)
  const AVANCOS = {
    [STATUS.CONFIRMADO]: ['iniciar', 'iniciar a produção'],
    [STATUS.EM_PRODUCAO]: ['pronto', 'marcar o pedido como pronto'],
    [STATUS.CONCLUIDO]: ['entregar', 'marcar o pedido como entregue'],
  }
  function avancar(pedido) {
    const [acao, oQueFazer] = AVANCOS[pedido.status]
    return agir(acao, () => avancarPedido(pedido.numero), oQueFazer)
  }

  const voltar = (pedido) => agir('voltar', () => voltarPedido(pedido.numero), 'voltar o pedido')

  // Os dados saem de todos os pedidos do cliente (ZAP-116, RN17): a lista é lida de novo para os
  // outros cards dele não continuarem com o nome antigo. Se a leitura falhar, o pedido aberto já
  // está certo e os outros se acertam na próxima vez que o quadro carregar.
  async function anonimizar(pedido) {
    const deuCerto = await agir('anonimizar', () => anonimizarCliente(pedido.numero), 'apagar os dados do cliente', true)
    if (deuCerto) buscarPedidos().then(setPedidos).catch(() => {})
    return deuCerto
  }

  // O link do WhatsApp abre na hora; marcar como enviada acontece em seguida
  async function enviarMensagem(indice) {
    try {
      atualizar(await marcarMensagemEnviada(aberto.numero, indice))
    } catch {
      setErroAcao('A mensagem foi aberta no WhatsApp, mas não deu para marcar como enviada. Tente novamente.')
    }
  }

  return (
    <div className={`${classes.pagina} ${telaGrande ? classes.paginaQuadro : ''}`}>
      <div className={classes.cabecalho}>
        <div>
          <h1 className={classes.titulo}>Pedidos</h1>
        </div>
        <div className={classes.acoesTopo}>
          {/* Sem rótulo visível, a pedido do Lucas: o nome vem do aria-label, e a opção escolhida
              ("Todos", "Confirmado (3)"...) já diz o que a caixa faz */}
          <NativeSelect
            id="filtro-status"
            aria-label="Filtrar pedidos por status"
            size="lg"
            value={filtro ? String(filtro) : ''}
            onChange={(evento) => mudarFiltro(evento.currentTarget.value)}
            data={[{ value: '', label: 'Todos' }, ...COLUNAS.map((c) => ({ value: String(c.status), label: `${c.nome} (${pedidosDaColuna(pedidos, c.status).length})` }))]}
            classNames={{ root: classes.filtro, label: classes.rotuloFiltro, input: classes.campoFiltro }}
          />
          <Button component={Link} to={`/pedidos/novo${search}`} id="novo-pedido" size="lg" leftSection={<IconPlus size={22} aria-hidden />} className={classes.novoPedido}>
            Novo pedido
          </Button>
        </div>
      </div>

      {colunaDoFiltro ? (
        <QuadroFiltrado coluna={colunaDoFiltro} pedidos={pedidosDaColuna(pedidos, colunaDoFiltro.status)} telaGrande={telaGrande} aoAbrir={abrir} aoVerTodos={verTodos} />
      ) : telaGrande ? (
        <div className={classes.quadro} style={{ '--colunas': colunas.length }}>
          {colunas.map((coluna) => {
            const daColuna = pedidosDaColuna(pedidos, coluna.status)
            return (
              <section key={coluna.status} className={classes.coluna} style={{ '--cor-coluna': coluna.cor }} data-recusado={coluna.status === STATUS.RECUSADO || undefined} aria-labelledby={`coluna-${coluna.status}`}>
                <h2 id={`coluna-${coluna.status}`} className={classes.tituloColuna}>
                  <span className={classes.ponto} style={{ background: coluna.cor }} aria-hidden />
                  {coluna.nome}
                  <span className={classes.contagem} aria-label={`${daColuna.length} ${daColuna.length === 1 ? 'pedido' : 'pedidos'}`}>
                    {daColuna.length}
                  </span>
                </h2>
                <ListaDaColuna coluna={coluna} pedidos={daColuna} semPedidos={semPedidos} aoAbrir={abrir} rolavel />
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
        aoAnonimizar={anonimizar}
        aoEnviarMensagem={enviarMensagem}
        enviando={enviando}
        acabouDe={acabouDe}
        erroAcao={erroAcao}
        busca={search}
      />

      <p className={classes.somenteLeitor} role="status" aria-live="polite">
        {anuncio}
      </p>

      {aviso && (
        <div className={classes.aviso} role="status">
          <IconCheck size={20} aria-hidden />
          {aviso}
        </div>
      )}
    </div>
  )
}
