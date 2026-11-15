import {
  IconAlertCircle,
  IconBan,
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
  contagemDosItens,
  itensDoPedido,
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
import { emPromocao } from '../produtos/regrasProdutos'
import { SelosAlergenos } from '../produtos/SelosAlergenos'
import base from './PaginaCardapio.module.css'
import { Foto, Preco, Rodape } from './partesCardapio'
import classes from './PedidoCardapio.module.css'
import { useTituloPagina } from './useTituloPagina'

// Montagem do pedido pelo cliente (ZAP-107, protótipo aprovado): o produto abre em página
// própria, com quantidade e observação, e vai para o "Seu pedido", onde o
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
  useTituloPagina(produto ? `${produto.nome} · ${loja.nome}` : 'Produto não encontrado')
  useTopoAoAbrir()
  const navegar = useNavigate()
  const [quantidade, setQuantidade] = useState(1)
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
        await navigator.share({ title: `${produto.nome} · ${loja.nome}`, url: window.location.href })
        return
      }
      await navigator.clipboard.writeText(window.location.href)
      setAviso('Link do produto copiado.')
    } catch (erro) {
      if (erro?.name !== 'AbortError') setAviso('Não foi possível compartilhar. Copie o endereço da página.')
    }
  }

  function adicionar() {
    // O nome, a foto e a unidade ficam guardados para o item continuar reconhecível se o produto
    // sair do cardápio (ZAP-156)
    montagem.adicionar({
      produtoId: produto.id,
      quantidade,
      observacao: observacao.trim(),
      nome: produto.nome,
      foto: produto.foto,
      unidade: produto.unidade,
    })
    navegar(cardapio, { state: { aviso: `${produto.nome} adicionado ao pedido.` } })
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
            {produto.categoria && <span className={classes.tipo}>{produto.categoria}</span>}
            <h2 id="nome-produto">{produto.nome}</h2>
            <Preco produto={produto} className={classes.precoGrande} />
            {produto.descricao && <p className={classes.descricao}>{produto.descricao}</p>}
            {/* Alérgenos embaixo da descrição, ao lado da foto no computador (ZAP-132) */}
            <SelosAlergenos alergenos={produto.alergenos} outros={produto.outrosAlergenos} className={classes.selos} />
            <p className={classes.lembrete}>
              <IconInfoCircle size={18} aria-hidden />
              <span>
                Tem alergia?{' '}
                <a href={linkWhatsapp(loja.whatsapp, `Olá! Tenho alergia e queria saber mais sobre o ${produto.nome}.`)} target="_blank" rel="noopener noreferrer">
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
              <Quantidade produto={produto} quantidade={quantidade} aoMudar={setQuantidade} rotulo={`Quantidade de ${produto.nome}`} />
              <span className={classes.valor}>
                Valor: <b className={emPromocao(produto) ? classes.valorPromocao : undefined}>{moeda(valor)}</b>
              </span>
            </div>
          </div>
        </section>

        {/* Sem recheio e cobertura (ZAP-140): a personalização vai na observação, em todos os produtos */}
        <section className={classes.cartao} aria-labelledby="titulo-observacoes">
          <header>
            <h3 id="titulo-observacoes">Observações</h3>
          </header>
          <div className={classes.corpo}>
            <label className={classes.campo}>
              <span id="dica-observacao">
                Algum detalhe? Ex.: tema da festa ou frase no bolo.
              </span>
              <textarea
                value={observacao}
                onChange={(e) => setObservacao(e.currentTarget.value)}
                maxLength={LIMITES.observacaoItem}
                rows={3}
                aria-labelledby="titulo-observacoes"
                aria-describedby="dica-observacao"
                placeholder="Escreva aqui"
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

const nomeDoItem = (item) => item.produto?.nome ?? item.nome ?? 'Produto indisponível'

// Produto que saiu do cardápio depois de entrar no pedido (ZAP-156): continua na lista, com a foto
// cinza, o selo "Indisponível" e a mensagem, sem mudar a quantidade e fora do total. O estado
// aparece em texto, e não só pela foto (NBR 17225 5.11.2).
function ItemIndisponivel({ item, aoRemover }) {
  const nome = nomeDoItem(item)
  const quantidade = item.unidade ? quantidadeTexto({ unidade: item.unidade }, item.quantidade) : null
  return (
    <li className={juntar(classes.item, classes.indisponivel)}>
      <Foto produto={{ foto: item.foto ?? '' }} className={classes.fotoMini} decorativa />
      <div className={classes.dados}>
        <span className={classes.seloIndisponivel}>
          <IconBan size={16} aria-hidden />
          Indisponível
        </span>
        <h3>{nome}</h3>
        {quantidade && <span className={classes.detalhe}>{quantidade}</span>}
        <p className={classes.mensagemIndisponivel}>
          <IconInfoCircle size={18} aria-hidden />
          <span>Este produto saiu do cardápio. Ele não entra no pedido nem no total.</span>
        </p>
        <button type="button" className={classes.remover} onClick={aoRemover} aria-label={`Remover ${nome}`}>
          <IconTrash size={18} aria-hidden />
          Remover
        </button>
      </div>
    </li>
  )
}

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
  const todos = itensDoPedido(pedido.itens, produtos)
  const itens = todos.filter((item) => item.disponivel)
  const indisponiveis = todos.length - itens.length
  const total = totalDoPedido(pedido.itens, produtos)
  const minima = dataMinima()

  function mudarCampo(campo, valor) {
    mudar(campo, valor)
    setErros((atuais) => ({ ...atuais, [campo]: undefined }))
  }

  function tirar(item) {
    remover(item.chave)
    setAviso(`${nomeDoItem(item)} removido do pedido.`)
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

  if (todos.length === 0) {
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
              {contagemDosItens(itens.length, indisponiveis)} · <Link to={cardapio}>Adicionar mais produtos</Link>
            </small>
          </header>
          <ul className={classes.itens}>
            {todos.map((item) => {
              if (!item.disponivel) return <ItemIndisponivel key={item.chave} item={item} aoRemover={() => tirar(item)} />
              const { produto } = item
              return (
                <li key={item.chave} className={classes.item}>
                  <Foto produto={produto} className={classes.fotoMini} decorativa />
                  <div className={classes.dados}>
                    <h3>{produto.nome}</h3>
                    <Preco produto={produto} className={classes.precoPequeno} />
                    {item.observacao && <p className={classes.detalhe}>Observação: {item.observacao}</p>}
                    <div className={classes.linhaQuantidade}>
                      <Quantidade
                        produto={produto}
                        quantidade={item.quantidade}
                        aoMudar={(quantidade) => mudarItem(item.chave, { quantidade })}
                        rotulo={`Quantidade de ${produto.nome}`}
                      />
                      <b className={juntar(classes.subtotal, emPromocao(produto) && classes.valorPromocao)}>{moeda(subtotal(produto, item.quantidade))}</b>
                    </div>
                    <button type="button" className={classes.remover} onClick={() => tirar(item)} aria-label={`Remover ${produto.nome}`}>
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

