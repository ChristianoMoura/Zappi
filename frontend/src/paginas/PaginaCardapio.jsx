import { Modal } from '@mantine/core'
import {
  IconAlertCircle,
  IconCalendarEvent,
  IconChevronLeft,
  IconChevronRight,
  IconDiscount,
  IconPlus,
  IconShoppingCart,
  IconCircleCheck,
  IconCreditCard,
  IconExternalLink,
  IconLinkOff,
  IconMapPin,
  IconMenu2,
  IconMoon,
  IconRefresh,
  IconSearch,
  IconShare,
  IconShoppingBag,
  IconSun,
  IconX,
} from '@tabler/icons-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import {
  agruparPorCategoria,
  AVISO_ENCOMENDA,
  filtrarProdutos,
  enderecoDaLoja,
  formasDaLoja,
  linkGoogleMaps,
  mapaGoogle,
  mensagemContato,
  REGRAS_ENCOMENDA,
  secaoPromocoes,
  telefoneTexto,
  textoPrecoLido,
  unidadeTexto,
} from '../cardapio/regrasCardapio'
import { juntar } from '../cardapio/juntarClasses'
import { nomeFormaPagamento } from '../comum/formasPagamento'
import { totalDoPedido } from '../cardapio/regrasPedidoCliente'
import { textoDescontoCurto } from '../produtos/regrasProdutos'
import { moeda } from '../pedidos/regrasPedidos'
import { usePedidoCliente } from '../cardapio/usePedidoCliente'
import { buscarCardapio, CardapioNaoEncontradoError } from '../cardapio/servicoCardapio'
import { useTemaCardapio } from '../cardapio/useTemaCardapio'
import classes from './PaginaCardapio.module.css'
import { BotaoWhatsapp, Foto, LogoLoja, Preco, Rodape } from './partesCardapio'
import { DetalheDoProduto, PedidoRecebido, SeuPedido } from './PedidoCardapio'
import { IconeFormaPagamento } from './IconeFormaPagamento'
import { useTituloPagina } from './useTituloPagina'


const ICONES_REGRAS ={ calendario: IconCalendarEvent, retirada: IconShoppingBag, pagamento: IconCreditCard, confirmacao: IconCircleCheck }

// Altura da barra compacta (logo, nome e ícones) em PaginaCardapio.module.css: 48 + 12 + 1 px
const ALTURA_BARRA_COMPACTA = 61
const movimentoReduzido =() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Página pública do cardápio (ZAP-105, layout H aprovado no protótipo): abre pelo link da loja,
// sem login (RN02), com só os produtos ativos (RN14). No celular, tudo em uma coluna; no
// computador, uma coluna central. A loja não tem endereço na página (LGPD).
export function PaginaCardapio() {
  const { slug, '*': resto = '' } = useParams()
  const [pagina, idProduto, sobra] = resto.split('/').filter(Boolean)
  const montagem = usePedidoCliente(slug)
  const [estado, setEstado] = useState({ situacao: 'carregando' })
  const [tentativa, setTentativa] = useState(0)
  const [escuro, alternarTema] = useTemaCardapio()

  // Com o cardápio carregado, cada tela (cardápio, produto, pedido, informações) dá o próprio título
  useTituloPagina(estado.situacao === 'inexistente' ? 'Cardápio não encontrado' : 'Cardápio')

  useEffect(() => {
    let ativo = true
    buscarCardapio(slug)
      .then((dados) => ativo && setEstado({ situacao: 'ok', ...dados }))
      .catch((erro) => ativo && setEstado({ situacao: erro instanceof CardapioNaoEncontradoError ? 'inexistente' : 'erro' }))
    return () => {
      ativo = false
    }
  }, [slug, tentativa])

  function tentarDeNovo() {
    setEstado({ situacao: 'carregando' })
    setTentativa((n) => n + 1)
  }

  const tema = juntar(classes.tema, escuro && classes.escuro)
  let conteudo
  if (estado.situacao === 'carregando') conteudo = <Carregando />
  else if (estado.situacao === 'erro') conteudo = <ErroAoCarregar aoTentar={tentarDeNovo} />
  else if (estado.situacao === 'inexistente') conteudo = <NaoEncontrado escuro={escuro} />
  else if (sobra) conteudo = <NaoEncontrado escuro={escuro} />
  else if (pagina === 'informacoes' && !idProduto) conteudo = <PerfilLoja loja={estado.estabelecimento} escuro={escuro} />
  else if (pagina === 'produto' && idProduto) {
    conteudo = <DetalheDoProduto key={idProduto} loja={estado.estabelecimento} produtos={estado.produtos} idProduto={idProduto} montagem={montagem} escuro={escuro} />
  } else if (pagina === 'pedido' && !idProduto) {
    conteudo = <SeuPedido loja={estado.estabelecimento} produtos={estado.produtos} montagem={montagem} escuro={escuro} />
  } else if (pagina === 'recebido' && !idProduto) {
    conteudo = <PedidoRecebido loja={estado.estabelecimento} escuro={escuro} />
  } else if (pagina) conteudo = <NaoEncontrado escuro={escuro} />
  else conteudo = <Cardapio loja={estado.estabelecimento} categorias={estado.categorias} produtos={estado.produtos} montagem={montagem} escuro={escuro} alternarTema={alternarTema} tema={tema} />

  return <div className={juntar(tema, classes.pagina)}>{conteudo}</div>
}

// ---------- Estados ----------

function Carregando() {
  return (
    <main className={classes.estado} aria-busy="true">
      <div className={classes.caixaEstado} role="status">
        <div className={classes.girando} aria-hidden="true" />
        <h1>Abrindo o cardápio…</h1>
        <p>Na primeira visita do dia, isso pode levar até 1 minuto. Não feche a página.</p>
      </div>
    </main>
  )
}

function ErroAoCarregar({ aoTentar }) {
  return (
    <main className={classes.estado}>
      <div className={classes.caixaEstado} role="alert">
        <span className={classes.iconeEstado}>
          <IconAlertCircle size={32} aria-hidden />
        </span>
        <h1>Não foi possível abrir o cardápio</h1>
        <p>Confira sua internet e tente novamente em alguns minutos.</p>
        <button type="button" className={classes.botaoContorno} onClick={aoTentar}>
          <IconRefresh size={22} aria-hidden />
          Tentar novamente
        </button>
      </div>
    </main>
  )
}

function NaoEncontrado({ escuro }) {
  return (
    <main className={classes.estado}>
      <div className={classes.caixaEstado}>
        <span className={classes.iconeEstado}>
          <IconLinkOff size={32} aria-hidden />
        </span>
        <h1>Cardápio não encontrado</h1>
        <p>Este link não leva a nenhuma confeitaria. Confira se o endereço que você recebeu está completo.</p>
      </div>
      <Rodape escuro={escuro} />
    </main>
  )
}

// ---------- Partes comuns ----------

function RegrasEncomenda() {
  return REGRAS_ENCOMENDA.map(({ icone, titulo, texto }) => {
    const Icone = ICONES_REGRAS[icone]
    return (
      <div key={titulo} className={classes.regra}>
        <span className={classes.iconeRegra}>
          <Icone size={20} aria-hidden />
        </span>
        <div>
          <b>{titulo}</b>
          <span>{texto}</span>
        </div>
      </div>
    )
  })
}

// ---------- Cardápio ----------

// Seção "Promoções" em faixa que rola para o lado (ZAP-162, referência aprovada em 15/11/2026):
// cartões pequenos com a foto, o "-13%" sobre ela, o nome em até 2 linhas e os dois preços. O
// cartão todo abre o produto, porque o cliente escolhe a quantidade no detalhe; o "+" é só um
// sinal. Cada cartão tem o nome completo para o leitor de tela. No computador, setas para rolar.
function FaixaPromocoes({ produtos, aoAbrir }) {
  const trilho = useRef(null)
  const rolar = (sentido) => {
    const lista = trilho.current
    lista?.scrollBy?.({ left: sentido * lista.clientWidth * 0.8, behavior: movimentoReduzido() ? 'auto' : 'smooth' })
  }
  return (
    <div className={classes.faixaPromocoes}>
      <button type="button" className={juntar(classes.setaFaixa, classes.setaEsquerda)} onClick={() => rolar(-1)} aria-label="Ver promoções anteriores">
        <IconChevronLeft size={22} aria-hidden />
      </button>
      <ul ref={trilho} className={classes.trilho} aria-label="Produtos em promoção">
        {produtos.map((p) => (
          <li key={p.id}>
            <button type="button" className={classes.cartaoPromocao} onClick={() => aoAbrir(p)} aria-label={`${p.nome}, ${textoPrecoLido(p)}`}>
              <span className={classes.fotoPromocao}>
                <Foto produto={p} decorativa />
                <span className={classes.descontoFoto} aria-hidden="true">
                  {textoDescontoCurto(p)}
                </span>
                <span className={classes.maisFoto} aria-hidden="true">
                  <IconPlus size={20} />
                </span>
              </span>
              <span className={classes.nomePromocao} aria-hidden="true">
                {p.nome}
              </span>
              <span className={classes.precosCartaoPromocao} aria-hidden="true">
                <s>{moeda(p.preco)}</s>
                <b>{moeda(p.precoPromocional)}</b>
                <small>{unidadeTexto(p)}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className={juntar(classes.setaFaixa, classes.setaDireita)} onClick={() => rolar(1)} aria-label="Ver mais promoções">
        <IconChevronRight size={22} aria-hidden />
      </button>
    </div>
  )
}

function Cardapio({ loja, categorias: categoriasDaLoja, produtos, montagem, escuro, alternarTema, tema }) {
  useTituloPagina(`Cardápio da ${loja.nome}`)
  const navegar = useNavigate()
  const { state } = useLocation()
  const [busca, setBusca] = useState('')
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [categoriasAbertas, setCategoriasAbertas] = useState(false)
  // O aviso de 'adicionado ao pedido' chega junto da volta do produto
  const [aviso, setAviso] = useState(state?.aviso ?? '')
  const [rolou, setRolou] = useState(false)
  const [atual, setAtual] = useState(null)

  const cabecalhoRef = useRef(null)
  const fixoRef = useRef(null)
  const buscaRef = useRef(null)

  const visiveis = filtrarProdutos(produtos, busca)
  // Seções e abas pelas categorias do painel, na ordem da loja (ZAP-140)
  const categorias = agruparPorCategoria(visiveis, categoriasDaLoja)
  const todasCategorias = agruparPorCategoria(produtos, categoriasDaLoja)
  // Seção "Promoções" no topo, antes das categorias (ZAP-162). Na busca, ela sai das seções, para o
  // produto não aparecer duas vezes; na janela "Categorias", continua
  const promocoes = secaoPromocoes(todasCategorias, { destacar: loja.destacarPromocoes, buscando: busca.trim() !== '' })
  const promocoesNaJanela = secaoPromocoes(todasCategorias, { destacar: loja.destacarPromocoes, buscando: false })
  const secoes = promocoes ? [promocoes, ...categorias] : categorias
  const secoesNaJanela = promocoesNaJanela ? [promocoesNaJanela, ...todasCategorias] : todasCategorias
  const categoriaAtual = String(atual ?? secoes[0]?.id)

  // Barra compacta depois do cabeçalho e aba da seção que está na tela
  useEffect(() => {
    function aoRolar() {
      const cabecalho = cabecalhoRef.current
      if (cabecalho) setRolou(cabecalho.getBoundingClientRect().bottom < 0)
      // Linha de baixo da parte fixa (barra compacta + abas)
      const fimFixo = fixoRef.current?.getBoundingClientRect().bottom ?? 0
      let visivel = null
      for (const secao of document.querySelectorAll('[data-categoria]')) {
        if (secao.getBoundingClientRect().top - fimFixo <= 48) visivel = secao.dataset.categoria
      }
      const noFim = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
      const secoes = document.querySelectorAll('[data-categoria]')
      if (noFim && window.scrollY > 0 && secoes.length) visivel = secoes[secoes.length - 1].dataset.categoria
      setAtual(visivel)
    }
    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [secoes.length])

  const irPara = useCallback((id) => {
    const secao = document.getElementById(`categoria-${id}`)
    if (!secao) return
    // Ao chegar na seção, a barra compacta já aparece em cima das abas: conta com ela
    const alturaFixo = (fixoRef.current?.offsetHeight ?? 0) + ALTURA_BARRA_COMPACTA
    const topo = secao.getBoundingClientRect().top + window.scrollY - alturaFixo - 8
    window.scrollTo({ top: Math.max(0, topo), behavior: movimentoReduzido() ? 'auto' : 'smooth' })
    setAtual(id)
  }, [])

  function alternarBusca() {
    setBuscaAberta((aberta) => {
      if (aberta) setBusca('')
      return !aberta
    })
  }
  useEffect(() => {
    if (buscaAberta) buscaRef.current?.focus()
  }, [buscaAberta])

  const avisar = useCallback((texto) => {
    setAviso(texto)
    setTimeout(() => setAviso(''), 4000)
  }, [])

  // Volta do produto: mesmo ponto da lista e o aviso de "adicionado ao pedido"
  useEffect(() => {
    const chaveRolagem = `zappi.cardapio.rolagem.${loja.slug}`
    let rolagem = null
    try {
      rolagem = sessionStorage.getItem(chaveRolagem)
      sessionStorage.removeItem(chaveRolagem)
    } catch {
      // Sem armazenamento: começa do topo
    }
    if (rolagem) window.scrollTo(0, Number(rolagem))
    if (state?.aviso) {
      setTimeout(() => setAviso(''), 4000)
      navegar(`/cardapio/${loja.slug}`, { replace: true, state: null })
    }
  }, [loja.slug, state, navegar])

  function abrirProduto(produto) {
    try {
      sessionStorage.setItem(`zappi.cardapio.rolagem.${loja.slug}`, String(window.scrollY))
    } catch {
      // Sem armazenamento: a volta começa do topo
    }
    navegar(`/cardapio/${loja.slug}/produto/${produto.id}`)
  }

  const itensNoPedido = montagem.pedido.itens.filter((item) => produtos.some((p) => p.id === item.produtoId)).length

  async function compartilhar(produto) {
    const url = window.location.href
    const titulo = produto ? `${produto.nome} · ${loja.nome}` : `Cardápio da ${loja.nome}`
    try {
      if (navigator.share) {
        await navigator.share({ title: titulo, url })
        return
      }
      await navigator.clipboard.writeText(url)
      avisar('Link do cardápio copiado.')
    } catch (erro) {
      if (erro?.name !== 'AbortError') avisar('Não foi possível compartilhar. Copie o endereço da página.')
    }
  }

  const icones = (
    <div className={classes.acoes}>
      <button type="button" className={classes.icone} onClick={alternarBusca} aria-label="Buscar no cardápio" aria-expanded={buscaAberta} aria-controls="busca-cardapio">
        <IconSearch size={22} aria-hidden />
      </button>
      <button type="button" className={classes.icone} onClick={alternarTema} aria-label={escuro ? 'Usar tema claro' : 'Usar tema escuro'}>
        {escuro ? <IconSun size={22} aria-hidden /> : <IconMoon size={22} aria-hidden />}
      </button>
      <button type="button" className={classes.icone} onClick={() => compartilhar()} aria-label="Compartilhar o cardápio">
        <IconShare size={22} aria-hidden />
      </button>
    </div>
  )

  return (
    <>
      <div className={classes.coluna}>
        <div className={classes.capa}>{loja.capa && <img src={loja.capa} alt="" />}</div>

        <header ref={cabecalhoRef} className={classes.cabecalho}>
          <LogoLoja loja={loja} className={classes.logo} />
          {!rolou && icones}
          <h1>{loja.nome}</h1>
          {loja.descricao && <p className={classes.descricaoLoja}>{loja.descricao}</p>}
          <p className={classes.aviso}>
            <IconCalendarEvent size={18} aria-hidden />
            {AVISO_ENCOMENDA}
          </p>
          <Link to={`/cardapio/${loja.slug}/informacoes`} className={classes.maisInformacoes}>
            Mais informações
          </Link>
        </header>

        {produtos.length === 0 ? (
          <main className={classes.vazio}>
            <h2>Ainda não há produtos no cardápio</h2>
            <p>Fale com a loja pelo WhatsApp para saber o que ela está fazendo.</p>
          </main>
        ) : (
          <>
            {/* Barra compacta presa no topo, fora do fluxo, para não mudar a altura da página */}
            {rolou && (
              <div className={classes.mini}>
                <div className={classes.miniConteudo}>
                  <LogoLoja loja={loja} className={classes.logoMini} />
                  <b aria-hidden="true">{loja.nome}</b>
                  {icones}
                </div>
              </div>
            )}
            <div ref={fixoRef} className={classes.fixo} style={{ top: rolou ? ALTURA_BARRA_COMPACTA : 0 }}>
              <nav className={classes.abas} aria-label="Categorias do cardápio">
                <button type="button" className={classes.menu} onClick={() => setCategoriasAbertas(true)} aria-label="Ver todas as categorias">
                  <IconMenu2 size={24} aria-hidden />
                </button>
                <div className={classes.listaAbas}>
                  {secoes.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={classes.aba}
                      aria-current={String(c.id) === categoriaAtual ? 'true' : undefined}
                      onClick={() => irPara(c.id)}
                    >
                      {c.titulo}
                    </button>
                  ))}
                </div>
              </nav>
            </div>

            <main className={classes.principal}>
              {buscaAberta && (
                <div className={classes.busca} id="busca-cardapio">
                  <IconSearch size={22} aria-hidden />
                  <input
                    ref={buscaRef}
                    type="search"
                    value={busca}
                    onChange={(e) => setBusca(e.currentTarget.value)}
                    placeholder="Buscar no cardápio"
                    aria-label="Buscar no cardápio"
                  />
                </div>
              )}

              {secoes.length === 0 && (
                <p className={classes.semResultado} role="status">
                  Nenhum produto encontrado.
                </p>
              )}

              {secoes.map((c) => (
                <section key={c.id} id={`categoria-${c.id}`} data-categoria={c.id} aria-labelledby={`titulo-${c.id}`}>
                  <h2 id={`titulo-${c.id}`} className={classes.tituloSecao}>
                    {c.promocoes ? (
                      <span className={classes.tituloPromocoes}>
                        <IconDiscount size={22} aria-hidden />
                        {c.titulo}
                      </span>
                    ) : (
                      c.titulo
                    )}
                  </h2>
                  {c.promocoes ? (
                    <FaixaPromocoes produtos={c.produtos} aoAbrir={abrirProduto} />
                  ) : (
                  <ul className={classes.lista}>
                    {c.produtos.map((p) => (
                      <li key={p.id}>
                        <button type="button" className={classes.item} onClick={() => abrirProduto(p)}>
                          <div className={classes.textoItem}>
                            <h3>{p.nome}</h3>
                            {p.descricao && <p className={classes.descricao}>{p.descricao}</p>}
                            <Preco produto={p} />
                          </div>
                          <Foto produto={p} className={classes.fotoItem} />
                          <span className={classes.somenteLeitor}>Ver detalhes</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  )}
                </section>
              ))}
            </main>
          </>
        )}

        <Rodape escuro={escuro} />
        <div className={classes.barraBaixo}>
          {itensNoPedido > 0 ? (
            <Link to={`/cardapio/${loja.slug}/pedido`} className={juntar(classes.whats, classes.verPedido)}>
              <span>
                <IconShoppingCart size={24} aria-hidden />
                Ver pedido · {itensNoPedido} {itensNoPedido === 1 ? 'item' : 'itens'}
              </span>
              <b>{moeda(totalDoPedido(montagem.pedido.itens, produtos))}</b>
            </Link>
          ) : (
            <BotaoWhatsapp loja={loja} texto={mensagemContato(loja)} rotulo="Falar com a loja no WhatsApp" />
          )}
        </div>
      </div>

      <p className={classes.toast} role="status" aria-live="polite">
        {aviso}
      </p>

      <Modal.Root opened={categoriasAbertas} onClose={() => setCategoriasAbertas(false)} centered size="sm">
        <Modal.Overlay />
        <Modal.Content className={juntar(tema, classes.janela)}>
          <Modal.Header className={classes.cabecalhoJanela}>
            <Modal.Title className={classes.tituloJanela}>Categorias</Modal.Title>
            <Modal.CloseButton icon={<IconX size={22} />} aria-label="Fechar categorias" className={classes.icone} />
          </Modal.Header>
          <Modal.Body p={0}>
            {secoesNaJanela.map((c) => (
              <button
                key={c.id}
                type="button"
                className={classes.categoria}
                aria-current={String(c.id) === categoriaAtual ? 'true' : undefined}
                onClick={() => {
                  setCategoriasAbertas(false)
                  setBusca('')
                  setTimeout(() => irPara(c.id), 0)
                }}
              >
                {c.titulo}
                <small>
                  {c.produtos.length} {c.produtos.length === 1 ? 'produto' : 'produtos'}
                </small>
              </button>
            ))}
          </Modal.Body>
        </Modal.Content>
      </Modal.Root>
    </>
  )
}

// ---------- Perfil da loja ("Mais informações") ----------

// Endereço de retirada (ZAP-186): por extenso, no mapa do Google e com o botão para traçar a rota.
// Sem endereço completo, pede para combinar o local pelo WhatsApp
function Retirada({ loja }) {
  const endereco = enderecoDaLoja(loja)
  if (!endereco) {
    return (
      <>
        <p className={classes.endereco}>
          <IconMapPin size={22} aria-hidden />
          <span>Combine o local de retirada pelo WhatsApp.</span>
        </p>
        <BotaoWhatsapp loja={loja} texto={mensagemContato(loja)} rotulo="Combinar pelo WhatsApp" />
      </>
    )
  }
  // Chave da Maps Embed API (ZAP-184), só no ambiente (Render ou .env.local), nunca no repositório
  const mapa = mapaGoogle(endereco, import.meta.env.VITE_GOOGLE_MAPS_CHAVE)
  return (
    <>
      <p className={classes.endereco}>
        <IconMapPin size={22} aria-hidden />
        <span>
          {endereco.linhas.map((linha, indice) => (indice === 0 ? <b key={linha}>{linha}</b> : <span key={linha}>{linha}</span>))}
        </span>
      </p>
      {mapa && (
        <div className={classes.mapa}>
          <iframe
            title={`Mapa do local de retirada: ${endereco.texto}`}
            src={mapa}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            tabIndex={-1}
          />
        </div>
      )}
      <a className={classes.abrirMapa} href={linkGoogleMaps(endereco)} target="_blank" rel="noopener noreferrer">
        Abrir no Google Maps
        <IconExternalLink size={18} aria-hidden />
        <span className={classes.somenteLeitor}> (abre em outra aba)</span>
      </a>
    </>
  )
}

function PerfilLoja({ loja, escuro }) {
  useTituloPagina(`Informações · ${loja.nome}`)
  return (
    <div className={juntar(classes.coluna, classes.perfil)}>
      <header className={classes.topoPerfil}>
        <Link to={`/cardapio/${loja.slug}`} className={classes.icone} aria-label="Voltar ao cardápio">
          <IconChevronLeft size={24} aria-hidden />
        </Link>
        <h1>Informações da loja</h1>
      </header>
      <main>
        <div className={classes.cartaoPerfil}>
          <div className={classes.lojaLinha}>
            <LogoLoja loja={loja} className={classes.logoPerfil} />
            <b>{loja.nome}</b>
          </div>
          <p className={classes.aviso}>
            <IconCalendarEvent size={18} aria-hidden />
            {AVISO_ENCOMENDA}
          </p>
        </div>

        {loja.descricao && (
          <section aria-labelledby="perfil-sobre">
            <h2 id="perfil-sobre" className={classes.tituloBloco}>Sobre</h2>
            <div className={classes.bloco}>
              <p>{loja.descricao}</p>
            </div>
          </section>
        )}
        <section aria-labelledby="perfil-encomenda">
          <h2 id="perfil-encomenda" className={classes.tituloBloco}>Como funciona a encomenda</h2>
          <div className={classes.bloco}>
            <RegrasEncomenda />
          </div>
        </section>
        <section aria-labelledby="perfil-pagamento">
          <h2 id="perfil-pagamento" className={classes.tituloBloco}>Formas de pagamento</h2>
          <div className={classes.bloco}>
            <ul className={classes.pagamentos}>
              {/* Só as formas que a loja aceita, na ordem da lista (ZAP-194) */}
              {formasDaLoja(loja).map((codigo) => {
                return (
                  <li key={codigo} className={classes.pagamento}>
                    <span className={classes.iconePagamento}>
                      <IconeFormaPagamento codigo={codigo} />
                    </span>
                    <b>{nomeFormaPagamento(codigo)}</b>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
        <section aria-labelledby="perfil-retirada">
          <h2 id="perfil-retirada" className={classes.tituloBloco}>Retirada</h2>
          <div className={classes.bloco}>
            <Retirada loja={loja} />
          </div>
        </section>
        <section aria-labelledby="perfil-contato">
          <h2 id="perfil-contato" className={classes.tituloBloco}>Contato</h2>
          {loja.whatsapp && (
            <div className={classes.bloco}>
              <p>WhatsApp: {telefoneTexto(loja.whatsapp)}</p>
            </div>
          )}
          <div className={classes.botaoContato}>
            <BotaoWhatsapp loja={loja} texto={mensagemContato(loja)} rotulo="Falar com a loja no WhatsApp" />
          </div>
        </section>
      </main>
      <Rodape escuro={escuro} />
    </div>
  )
}
