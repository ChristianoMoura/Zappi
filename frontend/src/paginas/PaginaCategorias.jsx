import { Alert, Button, Checkbox, Loader, Modal, TextInput } from '@mantine/core'
import { IconAlertCircle, IconCake, IconCheck, IconChevronLeft, IconGripVertical, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { LIMITE_NOME, moverNaLista, quantidadeTexto, validarNomeCategoria } from '../categorias/regrasCategorias'
import { buscarCategorias, CategoriaRecusadaError, excluirCategoria, reordenarCategorias, salvarCategoria } from '../categorias/servicoCategorias'
import { buscarProdutos } from '../produtos/servicoProdutos'
import produtos from '../produtos/Produtos.module.css'
import classes from '../categorias/Categorias.module.css'
import { useTituloPagina } from './useTituloPagina'

// Distância mínima, em pixels, para o toque na alça virar arraste (e não um clique)
const INICIO_ARRASTE = 5

// Categorias do cardápio (ZAP-139, US3, RF05). A ordem desta lista é a do cardápio e das listas
// do painel. A Lídia muda a ordem arrastando a categoria pela alça, com o mouse ou o dedo; pelo
// teclado, na alça, Espaço pega, as setas movem, Espaço solta e Esc desfaz, com cada passo
// anunciado (NBR 17225 5.1.1 e 5.1.4).
export function PaginaCategorias() {
  useTituloPagina('Categorias')
  const navegar = useNavigate()
  const [categorias, setCategorias] = useState([])
  const [contagem, setContagem] = useState({})
  const [carregando, setCarregando] = useState(true)
  const [erroCarregar, setErroCarregar] = useState(false)
  const [anuncio, setAnuncio] = useState('')
  const [aviso, setAviso] = useState(null)
  const [janela, setJanela] = useState(null)
  const [pega, setPega] = useState(null)
  const [arrastando, setArrastando] = useState(null)
  // Cópias do estado para os eventos do arraste, que continuam valendo entre um render e outro
  const atuais = useRef(categorias)
  const pegaAtual = useRef(pega)
  // Alça que precisa continuar com o foco depois que a lista muda de ordem: o React move os
  // elementos na página, e o navegador tira o foco do que foi movido
  const manterFoco = useRef(null)
  const ordemAntes = useRef(null)
  const arraste = useRef(null)
  const itens = useRef({})
  const titulo = useRef(null)
  const botaoNova = useRef(null)
  const focoDepois = useRef(null)

  useEffect(() => {
    let ativo = true
    Promise.all([buscarCategorias(), buscarProdutos()])
      .then(([lista, cardapio]) => {
        if (!ativo) return
        setCategorias(lista)
        const porCategoria = {}
        for (const p of cardapio) if (p.categoria) porCategoria[p.categoria.id] = (porCategoria[p.categoria.id] ?? 0) + 1
        setContagem(porCategoria)
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

  // Ao abrir, o foco vai para o título, que diz em que tela a Lídia está
  useEffect(() => {
    if (!carregando) titulo.current?.focus()
  }, [carregando])

  useLayoutEffect(() => {
    atuais.current = categorias
    pegaAtual.current = pega
    const id = manterFoco.current
    if (id === null) return
    const alca = document.getElementById(`alca-${id}`)
    if (alca && document.activeElement !== alca) alca.focus()
    // Solta a categoria: o foco volta a ser livre
    if (pegaAtual.current === null && !arraste.current) manterFoco.current = null
  }, [categorias, pega])

  // Durante o arraste, o ponteiro é acompanhado na janela toda
  useEffect(() => () => arraste.current?.parar(), [])

  useEffect(() => {
    if (!aviso) return undefined
    const tempo = setTimeout(() => setAviso(null), 4000)
    return () => clearTimeout(tempo)
  }, [aviso])

  if (carregando) {
    return (
      <div className={produtos.estado} role="status">
        <Loader color="zappi" type="dots" />
        Carregando as categorias…
      </div>
    )
  }

  if (erroCarregar) {
    return (
      <Alert color="#b42318" variant="outline" icon={<IconAlertCircle size={22} aria-hidden />} className={produtos.erroCarregar}>
        Não foi possível carregar as categorias agora. Tente novamente em alguns minutos.
      </Alert>
    )
  }

  const posicao = (id, lista = categorias) => lista.findIndex((c) => c.id === id) + 1

  // Grava a ordem nova; se o servidor recusar, volta a lista como estava
  async function gravarOrdem(nova, anterior, id) {
    const nome = nova.find((c) => c.id === id).nome
    if (nova.every((c, i) => c.id === anterior[i].id)) {
      setAnuncio(`${nome} continua na posição ${posicao(id, nova)} de ${nova.length}.`)
      return
    }
    setAnuncio(`${nome} solta na posição ${posicao(id, nova)} de ${nova.length}.`)
    try {
      setCategorias(await reordenarCategorias(nova.map((c) => c.id)))
    } catch {
      setCategorias(anterior)
      setAnuncio('')
      setAviso({ tipo: 'erro', texto: 'Não foi possível salvar a nova ordem. Tente de novo em alguns minutos.' })
    }
  }

  // ---------- Arrastar com o mouse ou o dedo ----------
  function comecarArraste(evento, id) {
    if (evento.button > 0 || arraste.current) return
    const parar = () => {
      window.removeEventListener('pointermove', moverArraste)
      window.removeEventListener('pointerup', terminarArraste)
      window.removeEventListener('pointercancel', terminarArraste)
    }
    arraste.current = { id, y: evento.clientY, moveu: false, antes: categorias, parar }
    manterFoco.current = id
    window.addEventListener('pointermove', moverArraste)
    window.addEventListener('pointerup', terminarArraste)
    window.addEventListener('pointercancel', terminarArraste)
  }

  function moverArraste(evento) {
    const atual = arraste.current
    if (!atual) return
    if (!atual.moveu) {
      if (Math.abs(evento.clientY - atual.y) < INICIO_ARRASTE) return
      atual.moveu = true
      setArrastando(atual.id)
    }
    const lista = atuais.current
    const de = lista.findIndex((c) => c.id === atual.id)
    const outras = lista.filter((c) => c.id !== atual.id)
    // A categoria entra antes da primeira outra cujo meio esteja abaixo do ponteiro
    let para = outras.findIndex((c) => {
      const caixa = itens.current[c.id]?.getBoundingClientRect()
      return caixa && evento.clientY < caixa.top + caixa.height / 2
    })
    if (para === -1) para = outras.length
    if (para !== de) {
      const nova = moverNaLista(lista, de, para)
      atuais.current = nova
      setCategorias(nova)
    }
  }

  function terminarArraste() {
    const atual = arraste.current
    arraste.current = null
    atual?.parar()
    if (!atual?.moveu) {
      if (pegaAtual.current === null) manterFoco.current = null
      return
    }
    setArrastando(null)
    document.getElementById(`alca-${atual.id}`)?.focus()
    void gravarOrdem(atuais.current, atual.antes, atual.id)
  }

  // ---------- Teclado e leitor de tela ----------
  function tecladoNaAlca(evento, id) {
    const i = posicao(id) - 1
    const nome = categorias[i].nome
    const total = categorias.length
    if (evento.key === ' ' || evento.key === 'Enter') {
      evento.preventDefault()
      if (pega === id) {
        setPega(null)
        void gravarOrdem(categorias, ordemAntes.current, id)
        ordemAntes.current = null
        return
      }
      ordemAntes.current = categorias
      manterFoco.current = id
      setPega(id)
      setAnuncio(`${nome} pega, posição ${i + 1} de ${total}. Use as setas para mover e Espaço para soltar.`)
      return
    }
    if (pega !== id) return
    if (evento.key === 'ArrowUp' || evento.key === 'ArrowDown') {
      evento.preventDefault()
      const j = i + (evento.key === 'ArrowUp' ? -1 : 1)
      if (j < 0) setAnuncio(`${nome} já está na 1ª posição.`)
      else if (j >= total) setAnuncio(`${nome} já está na última posição.`)
      else {
        setCategorias(moverNaLista(categorias, i, j))
        setAnuncio(`${nome}, posição ${j + 1} de ${total}.`)
      }
      return
    }
    if (evento.key === 'Escape') {
      evento.preventDefault()
      const antes = ordemAntes.current
      setCategorias(antes)
      setPega(null)
      ordemAntes.current = null
      setAnuncio(`Movimento desfeito. ${nome} voltou para a posição ${posicao(id, antes)}.`)
    }
  }

  // Saindo da alça com a categoria pega, ela fica onde está e a ordem é gravada. A conferência
  // espera um instante, porque mudar a ordem tira o foco da alça por um momento.
  function sairDaAlca(id) {
    setTimeout(() => {
      if (pegaAtual.current !== id || document.activeElement?.id === `alca-${id}`) return
      manterFoco.current = null
      setPega(null)
      void gravarOrdem(atuais.current, ordemAntes.current, id)
      ordemAntes.current = null
    })
  }

  // ---------- Janelas ----------
  function abrirJanela(nova, focoAoFechar) {
    focoDepois.current = focoAoFechar
    setJanela(nova)
  }

  function fecharJanela() {
    if (janela?.salvando) return
    setJanela(null)
  }

  async function salvarJanela(evento) {
    evento.preventDefault()
    const { categoria, nome, aceita } = janela
    const erro = validarNomeCategoria(nome, categorias, categoria?.id ?? null)
    if (erro) {
      setJanela({ ...janela, erro })
      document.getElementById('categoria-nome')?.focus()
      return
    }
    setJanela({ ...janela, erro: '', salvando: true })
    try {
      const salva = await salvarCategoria({ id: categoria?.id, nome: nome.trim(), aceitaRecheioCobertura: aceita })
      setCategorias((lista) => (categoria ? lista.map((c) => (c.id === salva.id ? salva : c)) : [...lista, salva]))
      setAviso({ tipo: 'ok', texto: categoria ? 'Alterações salvas.' : `Categoria ${salva.nome} criada no fim da lista.` })
      focoDepois.current = () => document.getElementById(`editar-${salva.id}`)
      setJanela(null)
    } catch (motivo) {
      const texto = motivo instanceof CategoriaRecusadaError ? (motivo.campos.nome ?? motivo.message) : 'Não foi possível salvar agora. Tente novamente em alguns minutos.'
      setJanela((atual) => ({ ...atual, salvando: false, erro: texto }))
      document.getElementById('categoria-nome')?.focus()
    }
  }

  async function confirmarExclusao() {
    const { categoria } = janela
    setJanela({ ...janela, salvando: true, erro: '' })
    try {
      await excluirCategoria(categoria.id)
      setCategorias((lista) => lista.filter((c) => c.id !== categoria.id))
      setAviso({ tipo: 'ok', texto: `Categoria ${categoria.nome} excluída.` })
      focoDepois.current = () => botaoNova.current
      setJanela(null)
    } catch (motivo) {
      const texto = motivo instanceof CategoriaRecusadaError ? motivo.message : 'Não foi possível excluir agora. Tente novamente em alguns minutos.'
      setJanela((atual) => ({ ...atual, salvando: false, erro: texto }))
    }
  }

  const doFoco = () => (typeof focoDepois.current === 'function' ? focoDepois.current() : focoDepois.current)
  const formulario = janela?.tipo === 'formulario'
  const exclusao = janela?.tipo === 'excluir'
  const comProdutos = exclusao ? (contagem[janela.categoria.id] ?? 0) : 0

  return (
    <div className={produtos.pagina}>
      <div className={produtos.formTopo}>
        <Button variant="subtle" onClick={() => navegar('/produtos')} leftSection={<IconChevronLeft size={22} aria-hidden />} className={produtos.voltar}>
          Produtos
        </Button>
        <div className={produtos.cabecalho}>
          <h1 ref={titulo} className={produtos.titulo} tabIndex={-1}>
            Categorias
          </h1>
          <Button
            ref={botaoNova}
            size="lg"
            leftSection={<IconPlus size={22} aria-hidden />}
            className={produtos.cadastrar}
            onClick={(e) => abrirJanela({ tipo: 'formulario', categoria: null, nome: '', aceita: false, erro: '' }, e.currentTarget)}
          >
            Nova categoria
          </Button>
        </div>
      </div>

      {categorias.length > 0 ? (
        <>
          <p className={classes.dica}>
            O cardápio mostra as categorias nesta ordem. Arraste pela alça <IconGripVertical size={18} aria-hidden /> para mudar.
          </p>
          <p id="instrucao-alca" className={classes.somenteLeitor}>
            Aperte Espaço para pegar, use as setas para cima e para baixo para mover e Espaço para soltar. Esc desfaz.
          </p>
          <ol className={`${classes.lista} ${arrastando ? classes.arrastando : ''}`}>
            {categorias.map((categoria, i) => {
              const ativa = pega === categoria.id || arrastando === categoria.id
              return (
                <li
                  key={categoria.id}
                  ref={(el) => {
                    itens.current[categoria.id] = el
                  }}
                  className={`${classes.categoria} ${ativa ? classes.pega : ''}`}
                  aria-labelledby={`categoria-${categoria.id}`}
                >
                  <button
                    type="button"
                    id={`alca-${categoria.id}`}
                    className={classes.alca}
                    aria-label={`Mover ${categoria.nome}, posição ${i + 1} de ${categorias.length}`}
                    aria-describedby="instrucao-alca"
                    aria-pressed={pega === categoria.id}
                    onPointerDown={(e) => comecarArraste(e, categoria.id)}
                    onKeyDown={(e) => tecladoNaAlca(e, categoria.id)}
                    onBlur={() => sairDaAlca(categoria.id)}
                  >
                    <IconGripVertical size={26} aria-hidden />
                  </button>
                  <span className={classes.posicao} aria-hidden="true">
                    {i + 1}
                  </span>
                  <h2 id={`categoria-${categoria.id}`} className={classes.nome}>
                    {categoria.nome}
                  </h2>
                  <p className={classes.detalhes}>
                    <span>{quantidadeTexto(contagem[categoria.id] ?? 0)}</span>
                    <span>
                      {categoria.aceitaRecheioCobertura ? (
                        <>
                          <IconCake size={18} aria-hidden /> Aceita recheio e cobertura
                        </>
                      ) : (
                        'Sem recheio e cobertura'
                      )}
                    </span>
                  </p>
                  <div className={classes.botoes}>
                    <Button
                      id={`editar-${categoria.id}`}
                      variant="outline"
                      leftSection={<IconPencil size={20} aria-hidden />}
                      aria-label={`Editar ${categoria.nome}`}
                      onClick={(e) => abrirJanela({ tipo: 'formulario', categoria, nome: categoria.nome, aceita: categoria.aceitaRecheioCobertura, erro: '' }, e.currentTarget)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="subtle"
                      color="#b42318"
                      className={classes.excluir}
                      leftSection={<IconTrash size={20} aria-hidden />}
                      aria-label={`Excluir ${categoria.nome}`}
                      onClick={(e) => abrirJanela({ tipo: 'excluir', categoria, erro: '' }, e.currentTarget)}
                    >
                      Excluir
                    </Button>
                  </div>
                </li>
              )
            })}
          </ol>
        </>
      ) : (
        <div className={produtos.vazio}>
          <h2>Nenhuma categoria ainda</h2>
          <p>Crie a primeira, por exemplo &quot;Bolos&quot; ou &quot;Salgados&quot;.</p>
        </div>
      )}

      <p className={classes.somenteLeitor} role="status" aria-live="polite">
        {anuncio}
      </p>

      <Modal
        opened={formulario}
        onClose={fecharJanela}
        title={formulario && janela.categoria ? `Editar ${janela.categoria.nome}` : 'Nova categoria'}
        centered
        size="lg"
        returnFocus={false}
        onExitTransitionEnd={() => doFoco()?.focus()}
        closeButtonProps={{ 'aria-label': 'Fechar sem salvar', size: 'xl' }}
        classNames={{ title: produtos.tituloJanela }}
      >
        {formulario && (
          <form className={produtos.janela} noValidate onSubmit={salvarJanela}>
            <TextInput
              id="categoria-nome"
              data-autofocus
              label="Nome da categoria"
              placeholder="Ex.: Doces finos"
              value={janela.nome}
              onChange={(e) => setJanela({ ...janela, nome: e.currentTarget.value, erro: '' })}
              error={janela.erro || undefined}
              maxLength={LIMITE_NOME}
              autoComplete="off"
              classNames={{ label: produtos.rotulo, input: produtos.campo, error: produtos.erroCampo }}
            />
            <Checkbox
              size="md"
              checked={janela.aceita}
              onChange={(e) => setJanela({ ...janela, aceita: e.currentTarget.checked })}
              label={<span className={classes.rotuloRecheio}>Os produtos desta categoria aceitam recheio e cobertura</span>}
              description="Os campos aparecem no pedido, no painel e no cardápio."
              className={classes.caixaRecheio}
            />
            <div className={produtos.botoesJanela}>
              <Button variant="outline" size="lg" onClick={fecharJanela} disabled={janela.salvando}>
                Cancelar
              </Button>
              <Button type="submit" size="lg" loading={janela.salvando} loaderProps={{ type: 'dots' }} leftSection={<IconCheck size={22} aria-hidden />}>
                Salvar categoria
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        opened={exclusao}
        onClose={fecharJanela}
        title={exclusao ? (comProdutos ? `Não dá para excluir ${janela.categoria.nome}` : `Excluir ${janela.categoria.nome}?`) : ''}
        centered
        size="lg"
        returnFocus={false}
        onExitTransitionEnd={() => doFoco()?.focus()}
        closeButtonProps={{ 'aria-label': 'Fechar sem excluir', size: 'xl' }}
        classNames={{ title: produtos.tituloJanela }}
      >
        {exclusao && (
          <div className={produtos.janela}>
            {comProdutos ? (
              <>
                <p>
                  Esta categoria tem {quantidadeTexto(comProdutos)}. Mova os produtos desta categoria antes de excluí-la.
                </p>
                <Button data-autofocus size="lg" onClick={fecharJanela}>
                  Entendi
                </Button>
              </>
            ) : (
              <>
                <p>A categoria sai da lista. Ela não tem produtos.</p>
                {janela.erro && (
                  <Alert color="#b42318" variant="outline" icon={<IconAlertCircle size={22} aria-hidden />} className={produtos.erroJanela} role="alert">
                    {janela.erro}
                  </Alert>
                )}
                <div className={produtos.botoesJanela}>
                  {/* O foco começa em "Manter categoria": um Enter sem querer não exclui nada */}
                  <Button data-autofocus variant="outline" size="lg" onClick={fecharJanela} disabled={janela.salvando}>
                    Manter categoria
                  </Button>
                  <Button color="#b42318" size="lg" onClick={confirmarExclusao} loading={janela.salvando} loaderProps={{ type: 'dots' }} leftSection={<IconTrash size={22} aria-hidden />}>
                    Excluir
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {aviso && (
        <div className={`${produtos.aviso} ${aviso.tipo === 'ok' ? produtos.avisoOk : produtos.avisoErro}`} role={aviso.tipo === 'ok' ? 'status' : 'alert'}>
          {aviso.tipo === 'ok' ? <IconCheck size={20} aria-hidden /> : <IconAlertCircle size={20} aria-hidden />}
          {aviso.texto}
        </div>
      )}
    </div>
  )
}
