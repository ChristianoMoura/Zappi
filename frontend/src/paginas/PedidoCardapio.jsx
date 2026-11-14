import {
  IconAlertCircle,
  IconCalendarEvent,
  IconChevronLeft,
  IconInfoCircle,
  IconMinus,
  IconPlus,
  IconShare,
  IconShoppingBag,
  IconTrash,
} from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { juntar } from '../cardapio/juntarClasses'
import { linkWhatsapp } from '../cardapio/regrasCardapio'
import {
  dataCurta,
  dataMinima,
  dataPorExtenso,
  HORARIOS,
  horaTexto,
  itensComProduto,
  LIMITES,
  mensagemDoPedido,
  mudarQuantidade,
  passo,
  quantidadeTexto,
  subtotal,
  totalDoPedido,
  validarPedido,
} from '../cardapio/regrasPedidoCliente'
import { moeda } from '../pedidos/regrasPedidos'
import { SelosAlergenos } from '../produtos/SelosAlergenos'
import base from './PaginaCardapio.module.css'
import { Foto, Preco, Rodape } from './partesCardapio'
import classes from './PedidoCardapio.module.css'
import { useTituloPagina } from './useTituloPagina'

// Montagem do pedido pelo cliente (ZAP-107, protótipo aprovado): o produto abre em página
// própria, com quantidade, personalização e observação, e vai para o "Seu pedido", onde o
// cliente escolhe a data e a hora de retirada. Enquanto o envio pelo Zappi não existe (ZAP-109
// e ZAP-110), o pedido segue pronto na mensagem do WhatsApp da loja.

const somenteLeitor = base.somenteLeitor

function useTopoAoAbrir() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
}

function Quantidade({ produto, quantidade, aoMudar, rotulo }) {
  const minimo = quantidade <= passo(produto)
  return (
    <div className={classes.passo} role="group" aria-label={rotulo}>
      <button type="button" onClick={() => aoMudar(mudarQuantidade(produto, quantidade, -1))} disabled={minimo} aria-label="Diminuir quantidade">
        <IconMinus size={22} aria-hidden />
      </button>
      <output aria-live="polite">{quantidadeTexto(produto, quantidade)}</output>
      <button type="button" onClick={() => aoMudar(mudarQuantidade(produto, quantidade, 1))} aria-label="Aumentar quantidade">
        <IconPlus size={22} aria-hidden />
      </button>
    </div>
  )
}

function TopoPagina({ titulo, voltarPara, children }) {
  return (
    <header className={classes.topo}>
      <div className={classes.topoConteudo}>
        <Link to={voltarPara} className={base.icone} aria-label="Voltar ao cardápio">
          <IconChevronLeft size={24} aria-hidden />
        </Link>
        <h1>{titulo}</h1>
        {children}
      </div>
    </header>
  )
}

// ---------- Detalhes do produto ----------

export function DetalheDoProduto({ loja, produtos, idProduto, montagem, escuro }) {
  const produto = produtos.find((p) => String(p.id) === idProduto)
  useTituloPagina(produto ? `${produto.sabor} · ${loja.nome}` : 'Produto não encontrado')
  useTopoAoAbrir()
  const navegar = useNavigate()
  const [quantidade, setQuantidade] = useState(1)
  const [recheio, setRecheio] = useState('')
  const [cobertura, setCobertura] = useState('')
  const [observacao, setObservacao] = useState('')
  const [aviso, setAviso] = useState('')
  const cardapio = `/cardapio/${loja.slug}`

  if (!produto) {
    return (
      <main className={base.estado}>
        <div className={base.caixaEstado}>
          <h1>Produto não encontrado</h1>
          <p>Ele pode ter saído do cardápio.</p>
          <Link to={cardapio} className={base.botaoContorno}>
            Ver o cardápio
          </Link>
        </div>
      </main>
    )
  }

  const porKg = produto.unidade === 'KG'
  const valor = subtotal(produto, quantidade)

  async function compartilhar() {
    try {
      if (navigator.share) {
        await navigator.share({ title: `${produto.sabor} · ${loja.nome}`, url: window.location.href })
        return
      }
      await navigator.clipboard.writeText(window.location.href)
      setAviso('Link do produto copiado.')
    } catch (erro) {
      if (erro?.name !== 'AbortError') setAviso('Não foi possível compartilhar. Copie o endereço da página.')
    }
  }

  function adicionar() {
    montagem.adicionar({
      produtoId: produto.id,
      quantidade,
      recheio: porKg ? recheio.trim() : '',
      cobertura: porKg ? cobertura.trim() : '',
      observacao: observacao.trim(),
    })
    navegar(cardapio, { state: { aviso: `${produto.sabor} adicionado ao pedido.` } })
  }

  const botaoCompartilhar = (
    <button type="button" className={base.icone} onClick={compartilhar} aria-label="Compartilhar este produto">
      <IconShare size={22} aria-hidden />
    </button>
  )

  return (
    <div className={classes.pagina}>
      <TopoPagina titulo="Detalhes do produto" voltarPara={cardapio}>
        {botaoCompartilhar}
      </TopoPagina>

      <main className={classes.coluna}>
        <section className={classes.info} aria-labelledby="nome-produto">
          <Foto produto={produto} className={classes.fotoProduto} />
          <div className={classes.texto}>
            <span className={classes.tipo}>{produto.nome}</span>
            <h2 id="nome-produto">{produto.sabor}</h2>
            <Preco produto={produto} className={classes.precoGrande} />
            {produto.descricao && <p className={classes.descricao}>{produto.descricao}</p>}
            {/* Alérgenos embaixo da descrição, ao lado da foto no computador (ZAP-132) */}
            <SelosAlergenos alergenos={produto.alergenos} outros={produto.outrosAlergenos} className={classes.selos} />
            <p className={classes.lembrete}>
              <IconInfoCircle size={18} aria-hidden />
              <span>
                Tem alergia?{' '}
                <a href={linkWhatsapp(loja.whatsapp, `Olá! Tenho alergia e queria saber mais sobre o ${produto.sabor}.`)} target="_blank" rel="noopener noreferrer">
                  Fale com a loja pelo WhatsApp<span className={somenteLeitor}> (abre o WhatsApp)</span>
                </a>{' '}
                antes de encomendar.
              </span>
            </p>
            <p className={classes.lembrete}>
              <IconCalendarEvent size={18} aria-hidden />
              Encomende com pelo menos 7 dias. Retirada na data combinada, sem entrega.
            </p>
          </div>
        </section>

        <section className={classes.cartao} aria-labelledby="titulo-quantidade">
          <header>
            <h3 id="titulo-quantidade">Quantidade</h3>
            <small>{porKg ? 'Vendido por kg, de 0,5 em 0,5 kg.' : 'Vendido por unidade.'}</small>
          </header>
          <div className={classes.corpo}>
            <div className={classes.linhaQuantidade}>
              <Quantidade produto={produto} quantidade={quantidade} aoMudar={setQuantidade} rotulo={`Quantidade de ${produto.sabor}`} />
              <span className={classes.valor}>
                Valor: <b>{moeda(valor)}</b>
              </span>
            </div>
          </div>
        </section>

        {porKg && (
          <section className={classes.cartao} aria-labelledby="titulo-personalizar">
            <header>
              <h3 id="titulo-personalizar">Quer personalizar o bolo?</h3>
              <small>Opcional. A loja confirma pelo WhatsApp.</small>
            </header>
            <div className={classes.corpo}>
              <label className={classes.campo}>
                <b>Recheio</b>
                <input value={recheio} onChange={(e) => setRecheio(e.currentTarget.value)} maxLength={LIMITES.recheio} placeholder="Ex.: brigadeiro branco" />
              </label>
              <label className={classes.campo}>
                <b>Cobertura</b>
                <input value={cobertura} onChange={(e) => setCobertura(e.currentTarget.value)} maxLength={LIMITES.cobertura} placeholder="Ex.: chantilly com morangos" />
              </label>
            </div>
          </section>
        )}

        <section className={classes.cartao} aria-labelledby="titulo-observacoes">
          <header>
            <h3 id="titulo-observacoes">Observações</h3>
            <small>Opcional.</small>
          </header>
          <div className={classes.corpo}>
            <label className={classes.campo}>
              <span id="dica-observacao">
                {porKg ? 'Quer outra massa? Escreva aqui. Também vale o tema da festa ou o que escrever no bolo.' : 'Algum detalhe sobre este item?'}
              </span>
              <textarea
                value={observacao}
                onChange={(e) => setObservacao(e.currentTarget.value)}
                maxLength={LIMITES.observacaoItem}
                rows={3}
                aria-labelledby="titulo-observacoes"
                aria-describedby="dica-observacao"
                placeholder={porKg ? 'Ex.: massa branca; escrever “Feliz aniversário, Ana”' : 'Escreva aqui'}
              />
            </label>
          </div>
        </section>
        <Rodape escuro={escuro} />
      </main>

      <footer className={classes.baixo}>
        <div className={classes.baixoConteudo}>
          <button type="button" className={classes.principal} onClick={adicionar}>
            <span>
              <IconShoppingBag size={22} aria-hidden />
              Adicionar ao pedido
            </span>
            <b>{moeda(valor)}</b>
          </button>
          <small>Você escolhe a data e a hora de retirada no seu pedido. Pagamento na retirada.</small>
        </div>
      </footer>

      <p className={base.toast} role="status" aria-live="polite">
        {aviso}
      </p>
    </div>
  )
}

// ---------- Seu pedido ----------

const ORDEM_DOS_ERROS = ['itens', 'data', 'hora', 'observacao']

export function SeuPedido({ loja, produtos, montagem, escuro }) {
  useTituloPagina(`Seu pedido · ${loja.nome}`)
  useTopoAoAbrir()
  const { pedido, mudarItem, remover, mudar } = montagem
  const [erros, setErros] = useState({})
  const [aviso, setAviso] = useState('')
  const dataRef = useRef(null)
  const horaRef = useRef(null)
  const observacaoRef = useRef(null)
  const cardapio = `/cardapio/${loja.slug}`
  const itens = itensComProduto(pedido.itens, produtos)
  const total = totalDoPedido(pedido.itens, produtos)
  const minima = dataMinima()

  function mudarCampo(campo, valor) {
    mudar(campo, valor)
    setErros((atuais) => ({ ...atuais, [campo]: undefined }))
  }

  function tirar(item) {
    remover(item.chave)
    setAviso(`${item.produto.sabor} removido do pedido.`)
  }

  function enviar(evento) {
    const novos = validarPedido(pedido, produtos)
    setErros(novos)
    const primeiro = ORDEM_DOS_ERROS.find((campo) => novos[campo])
    if (primeiro) {
      evento.preventDefault()
      const campos = { data: dataRef, hora: horaRef, observacao: observacaoRef }
      campos[primeiro]?.current?.focus()
    }
  }

  if (itens.length === 0) {
    return (
      <div className={classes.pagina}>
        <TopoPagina titulo="Seu pedido" voltarPara={cardapio} />
        <main className={juntar(classes.coluna, classes.vazio)}>
          <span className={classes.iconeVazio}>
            <IconShoppingBag size={32} aria-hidden />
          </span>
          <h2>Seu pedido está vazio</h2>
          <p>Escolha os produtos no cardápio e toque em "Adicionar ao pedido".</p>
          <Link to={cardapio} className={base.botaoContorno}>
            Ver o cardápio
          </Link>
          <p className={base.toast} role="status" aria-live="polite">
            {aviso}
          </p>
        </main>
      </div>
    )
  }

  const valido = Object.keys(validarPedido(pedido, produtos)).length === 0
  const erroDe = (campo) => (erros[campo] ? `erro-${campo}` : undefined)

  return (
    <div className={classes.pagina}>
      <TopoPagina titulo="Seu pedido" voltarPara={cardapio} />

      <main className={classes.coluna}>
        <section className={classes.cartao} aria-labelledby="titulo-itens">
          <header>
            <h2 id="titulo-itens">Itens</h2>
            <small>
              {itens.length} {itens.length === 1 ? 'item' : 'itens'} · <Link to={cardapio}>Adicionar mais produtos</Link>
            </small>
          </header>
          <ul className={classes.itens}>
            {itens.map((item) => {
              const { produto } = item
              const detalhes = [
                item.recheio && `Recheio: ${item.recheio}`,
                item.cobertura && `Cobertura: ${item.cobertura}`,
                item.observacao && `Observação: ${item.observacao}`,
              ].filter(Boolean)
              return (
                <li key={item.chave} className={classes.item}>
                  <Foto produto={produto} className={classes.fotoMini} decorativa />
                  <div className={classes.dados}>
                    <h3>{produto.sabor}</h3>
                    <Preco produto={produto} className={classes.precoPequeno} />
                    {detalhes.map((texto) => (
                      <p key={texto} className={classes.detalhe}>
                        {texto}
                      </p>
                    ))}
                    <div className={classes.linhaQuantidade}>
                      <Quantidade
                        produto={produto}
                        quantidade={item.quantidade}
                        aoMudar={(quantidade) => mudarItem(item.chave, { quantidade })}
                        rotulo={`Quantidade de ${produto.sabor}`}
                      />
                      <b className={classes.subtotal}>{moeda(subtotal(produto, item.quantidade))}</b>
                    </div>
                    <button type="button" className={classes.remover} onClick={() => tirar(item)} aria-label={`Remover ${produto.sabor}`}>
                      <IconTrash size={18} aria-hidden />
                      Remover
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        <section className={classes.cartao} aria-labelledby="titulo-retirada">
          <header>
            <h2 id="titulo-retirada">Data e hora de retirada</h2>
            <small>Obrigatórias. Pelo menos 7 dias a partir de hoje.</small>
          </header>
          <div className={classes.corpo}>
            <div className={classes.dataHora}>
              <label className={classes.campo}>
                <b>Data</b>
                <input
                  ref={dataRef}
                  type="date"
                  min={minima}
                  value={pedido.data}
                  onChange={(e) => mudarCampo('data', e.currentTarget.value)}
                  aria-invalid={Boolean(erros.data)}
                  aria-describedby={juntar('dica-data', erroDe('data'))}
                />
              </label>
              <label className={classes.campo}>
                <b>Hora</b>
                <select
                  ref={horaRef}
                  value={pedido.hora}
                  onChange={(e) => mudarCampo('hora', e.currentTarget.value)}
                  aria-invalid={Boolean(erros.hora)}
                  aria-describedby={juntar('dica-hora', erroDe('hora'))}
                >
                  <option value="">Escolha</option>
                  {HORARIOS.map((hora) => (
                    <option key={hora} value={hora}>
                      {horaTexto(hora)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <span className={classes.dica} id="dica-data">
              A partir de {dataCurta(minima)}. Retirada na data combinada, sem entrega.
            </span>
            <span className={classes.dica} id="dica-hora">
              Horários de 30 em 30 minutos, das 8h às 20h.
            </span>
            {['data', 'hora'].map(
              (campo) =>
                erros[campo] && (
                  <p key={campo} className={classes.erro} id={`erro-${campo}`}>
                    <IconAlertCircle size={20} aria-hidden />
                    {erros[campo]}
                  </p>
                ),
            )}
            {pedido.data && pedido.hora && pedido.data >= minima && (
              <p className={classes.resumoData}>
                Retirada: <b>{dataPorExtenso(pedido.data)}, às {horaTexto(pedido.hora)}</b>
              </p>
            )}
            <p className={classes.pressa}>
              Precisa para antes de 7 dias?{' '}
              <a href={linkWhatsapp(loja.whatsapp, `Olá! Preciso de uma encomenda da ${loja.nome} para antes de 7 dias. É possível?`)} target="_blank" rel="noopener noreferrer">
                Fale com a loja pelo WhatsApp<span className={somenteLeitor}> (abre o WhatsApp)</span>
              </a>
            </p>
          </div>
        </section>

        <section className={classes.cartao} aria-labelledby="titulo-observacao-pedido">
          <header>
            <h2 id="titulo-observacao-pedido">Observação do pedido</h2>
            <small>Opcional.</small>
          </header>
          <div className={classes.corpo}>
            <label className={classes.campo}>
              <span id="dica-observacao-pedido">Ocasião, tema da festa ou o que mais a loja precisa saber.</span>
              <textarea
                ref={observacaoRef}
                value={pedido.observacao}
                onChange={(e) => mudarCampo('observacao', e.currentTarget.value)}
                maxLength={LIMITES.observacao}
                rows={3}
                aria-labelledby="titulo-observacao-pedido"
                aria-describedby="dica-observacao-pedido"
                placeholder="Ex.: aniversário de 5 anos, tema fazenda"
              />
            </label>
          </div>
        </section>

        <section className={classes.cartao} aria-labelledby="titulo-total">
          <div className={classes.corpo}>
            <div className={classes.linhaTotal}>
              <h2 id="titulo-total">Total</h2>
              <b>{moeda(total)}</b>
            </div>
            <p className={classes.detalhe}>Valor estimado. A loja confirma o pedido e o valor pelo WhatsApp. Pagamento na retirada, sem entrega.</p>
          </div>
        </section>
        <Rodape escuro={escuro} />
      </main>

      <footer className={classes.baixo}>
        <div className={classes.baixoConteudo}>
          {/* Com tudo certo, o link abre o WhatsApp com o pedido pronto; sem data ou hora, mostra os erros */}
          <a
            className={classes.principal}
            href={valido ? linkWhatsapp(loja.whatsapp, mensagemDoPedido(loja, pedido, produtos)) : '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={enviar}
          >
            <span>Enviar pelo WhatsApp</span>
            <b>{moeda(total)}</b>
            <span className={somenteLeitor}> (abre o WhatsApp)</span>
          </a>
          <small>O pedido só vale depois da confirmação da loja. Pagamento na retirada.</small>
        </div>
      </footer>

      <p className={base.toast} role="status" aria-live="polite">
        {aviso}
      </p>
    </div>
  )
}

