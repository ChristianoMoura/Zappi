import { Modal } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import {
  IconAlertCircle,
  IconBrandWhatsapp,
  IconCalendarEvent,
  IconChevronLeft,
  IconCircleCheck,
  IconCreditCard,
  IconExternalLink,
  IconLinkOff,
  IconMapPin,
  IconMenu2,
  IconMoon,
  IconPhotoOff,
  IconRefresh,
  IconSearch,
  IconShare,
  IconShoppingBag,
  IconSun,
  IconX,
} from '@tabler/icons-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import zappiNomeCreme from '../assets/zappi-nome-creme.svg'
import zappiNome from '../assets/zappi-nome.svg'
import zappiSimboloCreme from '../assets/zappi-simbolo-creme.svg'
import zappiSimbolo from '../assets/zappi-simbolo.svg'
import {
  agruparPorCategoria,
  AVISO_ENCOMENDA,
  filtrarProdutos,
  linkWhatsapp,
  mensagemContato,
  mensagemPedido,
  PONTO_RETIRADA_EXEMPLO,
  precoTexto,
  REGRAS_ENCOMENDA,
  telefoneTexto,
  unidadeTexto,
} from '../cardapio/regrasCardapio'
import { buscarCardapio, CardapioNaoEncontradoError } from '../cardapio/servicoCardapio'
import { useTemaCardapio } from '../cardapio/useTemaCardapio'
import { iniciaisDaLoja } from '../estabelecimento/useMarcaLoja'
import classes from './PaginaCardapio.module.css'
import { useTituloPagina } from './useTituloPagina'

const ICONES_REGRAS = { calendario: IconCalendarEvent, retirada: IconShoppingBag, pagamento: IconCreditCard, confirmacao: IconCircleCheck }

const juntar = (...nomes) => nomes.filter(Boolean).join(' ')
// Altura da barra compacta (logo, nome e ícones) em PaginaCardapio.module.css: 48 + 12 + 1 px
const ALTURA_BARRA_COMPACTA = 61
const movimentoReduzido =() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Página pública do cardápio (ZAP-105, layout H aprovado no protótipo): abre pelo link da loja,
// sem login (RN02), com só os produtos ativos (RN14). No celular, tudo em uma coluna; no
// computador, uma coluna central. A loja não tem endereço na página (LGPD).
export function PaginaCardapio() {
  const { slug, pagina } = useParams()
  const [estado, setEstado] = useState({ situacao: 'carregando' })
  const [tentativa, setTentativa] = useState(0)
  const [escuro, alternarTema] = useTemaCardapio()

  useTituloPagina(estado.estabelecimento?.nome ? `Cardápio da ${estado.estabelecimento.nome}` : 'Cardápio')

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
  else if (pagina === 'informacoes') conteudo = <PerfilLoja loja={estado.estabelecimento} escuro={escuro} />
  else if (pagina) conteudo = <NaoEncontrado escuro={escuro} />
  else conteudo = <Cardapio loja={estado.estabelecimento} produtos={estado.produtos} escuro={escuro} alternarTema={alternarTema} tema={tema} />

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

function Rodape({ escuro }) {
  return (
    <p className={classes.rodape}>
      Cardápio feito com o
      <img src={escuro ? zappiSimboloCreme : zappiSimbolo} alt="" />
      <img src={escuro ? zappiNomeCreme : zappiNome} alt="Zappi" />
    </p>
  )
}

function LogoLoja({ loja, className }) {
  if (loja.logo) return <img src={loja.logo} alt={`Logo de ${loja.nome}`} className={className} />
  return (
    <span className={juntar(className, classes.iniciais)} role="img" aria-label={`Logo de ${loja.nome}`}>
      {iniciaisDaLoja(loja.nome)}
    </span>
  )
}

function Foto({ produto, className }) {
  return (
    <div className={juntar(classes.foto, className)}>
      {produto.foto ? (
        <img src={produto.foto} alt={produto.textoAlternativo} loading="lazy" />
      ) : (
        <span className={classes.semFoto}>
          <IconPhotoOff size={24} aria-hidden />
          Sem foto
        </span>
      )}
    </div>
  )
}

function Preco({ produto, className }) {
  return (
    <span className={juntar(classes.preco, className)}>
      {precoTexto(produto)} <small>{unidadeTexto(produto)}</small>
    </span>
  )
}

function BotaoWhatsapp({ loja, texto, rotulo, className }) {
  return (
    <a className={juntar(classes.whats, className)} href={linkWhatsapp(loja.whatsapp, texto)} target="_blank" rel="noopener noreferrer">
      <IconBrandWhatsapp size={24} aria-hidden />
      {rotulo}
      <span className={classes.somenteLeitor}> (abre o WhatsApp)</span>
    </a>
  )
}

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

function Cardapio({ loja, produtos, escuro, alternarTema, tema }) {
  const celular = useMediaQuery('(max-width: 47.99em)')
  const [busca, setBusca] = useState('')
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [categoriasAbertas, setCategoriasAbertas] = useState(false)
  const [produtoAberto, setProdutoAberto] = useState(null)
  const [aviso, setAviso] = useState('')
  const [rolou, setRolou] = useState(false)
  const [atual, setAtual] = useState(null)

  const cabecalhoRef = useRef(null)
  const fixoRef = useRef(null)
  const buscaRef = useRef(null)

  const visiveis = filtrarProdutos(produtos, busca)
  const categorias = agruparPorCategoria(visiveis)
  const todasCategorias = agruparPorCategoria(produtos)
  const categoriaAtual = atual ?? categorias[0]?.id

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
  }, [categorias.length])

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

  async function compartilhar(produto) {
    const url = window.location.href
    const titulo = produto ? `${produto.sabor} · ${loja.nome}` : `Cardápio da ${loja.nome}`
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
                  {categorias.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={classes.aba}
                      aria-current={c.id === categoriaAtual ? 'true' : undefined}
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

              {categorias.length === 0 && (
                <p className={classes.semResultado} role="status">
                  Nenhum produto encontrado.
                </p>
              )}

              {categorias.map((c) => (
                <section key={c.id} id={`categoria-${c.id}`} data-categoria={c.id} aria-labelledby={`titulo-${c.id}`}>
                  <h2 id={`titulo-${c.id}`} className={classes.tituloSecao}>
                    {c.titulo}
                  </h2>
                  <ul className={classes.lista}>
                    {c.produtos.map((p) => (
                      <li key={p.id}>
                        <button type="button" className={classes.item} onClick={() => setProdutoAberto(p)}>
                          <div className={classes.textoItem}>
                            <h3>{p.sabor}</h3>
                            {p.descricao && <p className={classes.descricao}>{p.descricao}</p>}
                            <Preco produto={p} />
                          </div>
                          <Foto produto={p} className={classes.fotoItem} />
                          <span className={classes.somenteLeitor}>Ver detalhes</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </main>
          </>
        )}

        <Rodape escuro={escuro} />
        <div className={classes.barraBaixo}>
          <BotaoWhatsapp loja={loja} texto={mensagemContato(loja)} rotulo="Falar com a loja no WhatsApp" />
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
            {todasCategorias.map((c) => (
              <button
                key={c.id}
                type="button"
                className={classes.categoria}
                aria-current={c.id === categoriaAtual ? 'true' : undefined}
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

      <DetalheProduto
        key={produtoAberto?.id ?? 'nenhum'}
        loja={loja}
        produto={produtoAberto}
        tema={tema}
        telaCheia={celular}
        aoFechar={() => setProdutoAberto(null)}
        aoCompartilhar={compartilhar}
      />
    </>
  )
}

// Detalhe do produto: página inteira no celular e janela no computador. A observação vai junto
// na mensagem do WhatsApp; montar o pedido pelo portal é outra história (ZAP-101 em diante).
function DetalheProduto({ loja, produto, tema, telaCheia, aoFechar, aoCompartilhar }) {
  const [observacao, setObservacao] = useState('')
  return (
    <Modal.Root opened={Boolean(produto)} onClose={aoFechar} fullScreen={telaCheia} size="56rem" centered>
      <Modal.Overlay />
      <Modal.Content className={juntar(tema, classes.janela, classes.janelaProduto)}>
        {produto && (
          <div className={classes.detalhe}>
            <div className={classes.fotoDetalhe}>
              <Foto produto={produto} />
              <button type="button" className={juntar(classes.botaoFoto, classes.voltar)} onClick={aoFechar} aria-label="Voltar ao cardápio">
                <IconChevronLeft size={24} aria-hidden />
              </button>
              <button type="button" className={juntar(classes.botaoFoto, classes.compartilharFoto)} onClick={() => aoCompartilhar(produto)} aria-label="Compartilhar este produto">
                <IconShare size={22} aria-hidden />
              </button>
            </div>
            <div className={classes.textoDetalhe}>
              <span className={classes.categoriaProduto}>{produto.nome}</span>
              <Modal.Title component="h2" className={classes.tituloProduto}>
                {produto.sabor}
              </Modal.Title>
              <Preco produto={produto} className={classes.precoDetalhe} />
              {produto.descricao && <p className={classes.descricaoDetalhe}>{produto.descricao}</p>}
              <label className={classes.observacao}>
                <b>Observações</b>
                <span id="dica-observacao">Opcional. Vai junto na mensagem para a loja.</span>
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.currentTarget.value)}
                  maxLength={300}
                  rows={3}
                  placeholder="Ex.: escrever “Feliz aniversário, Ana” no bolo"
                  aria-describedby="dica-observacao"
                />
              </label>
              <p className={classes.regrasDetalhe}>
                Encomende com pelo menos 7 dias. Retirada na data combinada e pagamento na retirada. O pedido vale depois da confirmação da loja.
              </p>
            </div>
            <div className={classes.baixoDetalhe}>
              <BotaoWhatsapp loja={loja} texto={mensagemPedido(loja, produto, observacao)} rotulo="Pedir pelo WhatsApp" />
            </div>
          </div>
        )}
      </Modal.Content>
    </Modal.Root>
  )
}

// ---------- Perfil da loja ("Mais informações") ----------

// Mapa do OpenStreetMap, sem chave de API, com o ponto marcado e o link para abrir em tela cheia
function MapaRetirada({ ponto }) {
  const margem = 0.004
  const caixa = [ponto.longitude - margem, ponto.latitude - margem, ponto.longitude + margem, ponto.latitude + margem].join(',')
  const mapa = `https://www.openstreetmap.org/export/embed.html?bbox=${caixa}&layer=mapnik&marker=${ponto.latitude},${ponto.longitude}`
  const abrir = `https://www.openstreetmap.org/?mlat=${ponto.latitude}&mlon=${ponto.longitude}#map=17/${ponto.latitude}/${ponto.longitude}`
  return (
    <>
      <div className={classes.endereco}>
        <IconMapPin size={22} aria-hidden />
        <div>
          <b>{ponto.endereco}</b>
          {ponto.ilustrativo && <span className={classes.etiqueta}>Endereço ilustrativo</span>}
        </div>
      </div>
      <div className={classes.mapa}>
        <iframe title={`Mapa do local de retirada: ${ponto.endereco}`} src={mapa} loading="lazy" referrerPolicy="no-referrer" />
      </div>
      <a className={classes.abrirMapa} href={abrir} target="_blank" rel="noopener noreferrer">
        Abrir no mapa
        <IconExternalLink size={18} aria-hidden />
        <span className={classes.somenteLeitor}> (abre em outra aba)</span>
      </a>
    </>
  )
}

function PerfilLoja({ loja, escuro }) {
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
            <p>Pagamento na retirada. Combine a forma de pagamento com a loja pelo WhatsApp.</p>
          </div>
        </section>
        <section aria-labelledby="perfil-retirada">
          <h2 id="perfil-retirada" className={classes.tituloBloco}>Retirada</h2>
          <div className={classes.bloco}>
            <p>Retire no endereço abaixo, na data e no horário combinados. Não há entrega.</p>
            <MapaRetirada ponto={PONTO_RETIRADA_EXEMPLO} />
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
