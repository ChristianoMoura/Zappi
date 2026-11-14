import { Alert, Button, Loader, Modal } from '@mantine/core'
import { IconAlertCircle, IconCategory, IconCheck, IconPlus, IconTrash } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { agruparPorCategoria, quantidadeTexto } from '../categorias/regrasCategorias'
import { CartaoProduto } from '../produtos/CartaoProduto'
import { JanelaTirarDoCardapio } from '../produtos/JanelaTirarDoCardapio'
import { buscarProdutos, excluirProduto, tirarDoCardapio, voltarAoCardapio } from '../produtos/servicoProdutos'
import classes from '../produtos/Produtos.module.css'
import { useTituloPagina } from './useTituloPagina'

// Lista de produtos do cardápio (ZAP-41, US3, RF05, RF06). Mostra todos os não excluídos, no
// cardápio e fora dele (ZAP-155). Tirar do cardápio e excluir pedem confirmação; voltar ao
// cardápio, não, porque não tira nada de lugar nenhum. Excluir é lógico (RN14). Cadastrar e
// editar abrem o formulário da ZAP-42.
export function PaginaProdutos() {
  useTituloPagina('Produtos')
  const { state } = useLocation()
  const [produtos, setProdutos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erroCarregar, setErroCarregar] = useState(false)
  const [paraExcluir, setParaExcluir] = useState(null)
  const [excluindo, setExcluindo] = useState(false)
  const [erroExcluir, setErroExcluir] = useState('')
  const [paraTirar, setParaTirar] = useState(null)
  const [tirando, setTirando] = useState(false)
  const [erroTirar, setErroTirar] = useState('')
  const [voltando, setVoltando] = useState(null)
  // Voltando do formulário depois de salvar, a lista já abre com o aviso e o cartão destacado
  const salvo = state?.salvo
  const foco = state?.foco
  const [aviso, setAviso] = useState(() => (salvo ? { tipo: 'ok', texto: salvo.novo ? `${salvo.nome} entrou no cardápio.` : 'Alterações salvas.' } : null))
  const destaque = salvo?.id ?? null
  const titulo = useRef(null)
  const origemExclusao = useRef(null)
  const origemTirar = useRef(null)

  useEffect(() => {
    let ativo = true
    buscarProdutos()
      .then((resposta) => {
        if (ativo) setProdutos(resposta)
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

  // Depois de salvar, o foco vai para o cartão salvo; depois de cancelar, volta para onde estava
  // (o cartão ou o botão de cadastrar). O destaque fica até a próxima visita à página.
  useEffect(() => {
    if (carregando || (!salvo && !foco)) return
    const alvo = document.getElementById(salvo ? `produto-${salvo.id}` : foco)
    alvo?.focus()
    alvo?.scrollIntoView?.({ block: 'center' })
  }, [carregando, salvo, foco])

  useEffect(() => {
    if (!aviso) return undefined
    const tempo = setTimeout(() => setAviso(null), 4000)
    return () => clearTimeout(tempo)
  }, [aviso])

  if (carregando) {
    return (
      <div className={classes.estado} role="status">
        <Loader color="zappi" type="dots" />
        Carregando os produtos…
      </div>
    )
  }

  if (erroCarregar) {
    return (
      <Alert color="#b42318" variant="outline" icon={<IconAlertCircle size={22} aria-hidden />} className={classes.erroCarregar}>
        Não foi possível carregar os produtos agora. Tente novamente em alguns minutos.
      </Alert>
    )
  }

  const grupos = agruparPorCategoria(produtos)

  function pedirExclusao(produto) {
    origemExclusao.current = document.activeElement
    setErroExcluir('')
    setParaExcluir(produto)
  }

  function fecharExclusao() {
    if (excluindo) return
    setParaExcluir(null)
  }

  async function confirmarExclusao() {
    setExcluindo(true)
    setErroExcluir('')
    try {
      await excluirProduto(paraExcluir.id)
      setProdutos((atuais) => atuais.filter((p) => p.id !== paraExcluir.id))
      setAviso({ tipo: 'ok', texto: `${paraExcluir.nome} foi excluído.` })
      origemExclusao.current = titulo.current
      setParaExcluir(null)
    } catch {
      setErroExcluir('Não foi possível excluir agora. Tente novamente em alguns minutos.')
    } finally {
      setExcluindo(false)
    }
  }

  // Troca o produto na lista pelo que o backend devolveu, mantendo a posição
  const trocar = (atualizado) => setProdutos((atuais) => atuais.map((p) => (p.id === atualizado.id ? atualizado : p)))

  function pedirTirar(produto) {
    origemTirar.current = document.activeElement
    setErroTirar('')
    setParaTirar(produto)
  }

  function fecharTirar() {
    if (tirando) return
    setParaTirar(null)
  }

  // Depois de tirar, o foco vai para o botão que tomou o lugar: "Voltar ao cardápio"
  async function confirmarTirar() {
    setTirando(true)
    setErroTirar('')
    try {
      const atualizado = await tirarDoCardapio(paraTirar.id)
      trocar(atualizado)
      setAviso({ tipo: 'ok', texto: `${atualizado.nome} saiu do cardápio. Ele continua aqui.` })
      origemTirar.current = { focus: () => document.getElementById(`estado-${atualizado.id}`)?.focus() }
      setParaTirar(null)
    } catch {
      setErroTirar('Não foi possível tirar do cardápio agora. Tente novamente em alguns minutos.')
    } finally {
      setTirando(false)
    }
  }

  async function voltar(produto) {
    setVoltando(produto.id)
    try {
      const atualizado = await voltarAoCardapio(produto.id)
      trocar(atualizado)
      setAviso({ tipo: 'ok', texto: `${atualizado.nome} voltou ao cardápio.` })
      setTimeout(() => document.getElementById(`estado-${atualizado.id}`)?.focus())
    } catch {
      setAviso({ tipo: 'erro', texto: 'Não foi possível voltar ao cardápio agora. Tente novamente em alguns minutos.' })
    } finally {
      setVoltando(null)
    }
  }

  return (
    <div className={classes.pagina}>
      <div className={classes.cabecalho}>
        <div>
          <h1 ref={titulo} className={classes.titulo} tabIndex={-1}>
            Produtos
          </h1>
        </div>
        <div className={classes.botoesCabecalho}>
          <Button component={Link} to="/categorias" variant="outline" size="lg" leftSection={<IconCategory size={22} aria-hidden />} className={classes.cadastrar}>
            Categorias
          </Button>
          <Button component={Link} to="/produtos/novo" id="cadastrar" size="lg" leftSection={<IconPlus size={22} aria-hidden />} className={classes.cadastrar}>
            Cadastrar produto
          </Button>
        </div>
      </div>

      {produtos.length > 0 ? (
        <>
          {/* Uma seção por categoria, na ordem definida pela Lídia (ZAP-139) */}
          {grupos.map(({ categoria, produtos: daCategoria }) => (
            <section key={categoria.id} className={classes.secaoCategoria} aria-labelledby={`categoria-${categoria.id}`}>
              <h2 id={`categoria-${categoria.id}`} className={classes.tituloCategoria}>
                {categoria.nome} <small>{quantidadeTexto(daCategoria.length)}</small>
              </h2>
              <div className={classes.grade}>
                {daCategoria.map((produto) => (
                  <CartaoProduto
                    key={produto.id}
                    produto={produto}
                    destaque={destaque === produto.id}
                    aoExcluir={pedirExclusao}
                    aoTirar={pedirTirar}
                    aoVoltar={voltar}
                    ocupado={voltando === produto.id}
                  />
                ))}
              </div>
            </section>
          ))}
        </>
      ) : (
        <div className={classes.vazio}>
          <h2>Seu cardápio está vazio</h2>
          <p>Cadastre o primeiro produto para usar nos pedidos.</p>
        </div>
      )}

      <Modal
        opened={paraExcluir !== null}
        onClose={fecharExclusao}
        title={paraExcluir ? `Excluir ${paraExcluir.nome}?` : ''}
        centered
        size="lg"
        returnFocus={false}
        onExitTransitionEnd={() => origemExclusao.current?.focus()}
        closeButtonProps={{ 'aria-label': 'Fechar sem excluir', size: 'xl' }}
        classNames={{ title: classes.tituloJanela }}
      >
        <div className={classes.janela}>
          <p>Ele sai desta lista e do cardápio e não pode ser escolhido em pedidos novos. Os pedidos que já têm este produto continuam como estão.</p>
          <p>Se for só por um tempo, use "Tirar do cardápio": o produto continua aqui.</p>
          {erroExcluir && (
            <Alert color="#b42318" variant="outline" icon={<IconAlertCircle size={22} aria-hidden />} className={classes.erroJanela} role="alert">
              {erroExcluir}
            </Alert>
          )}
          <div className={classes.botoesJanela}>
            {/* O foco começa em "Manter produto": um Enter sem querer não exclui nada */}
            <Button data-autofocus variant="outline" size="lg" onClick={fecharExclusao} disabled={excluindo}>
              Manter produto
            </Button>
            <Button color="#b42318" size="lg" onClick={confirmarExclusao} loading={excluindo} loaderProps={{ type: 'dots' }} leftSection={<IconTrash size={22} aria-hidden />}>
              Excluir produto
            </Button>
          </div>
        </div>
      </Modal>

      <JanelaTirarDoCardapio
        produto={paraTirar}
        aoFechar={fecharTirar}
        aoConfirmar={confirmarTirar}
        enviando={tirando}
        erro={erroTirar}
        aoTerminarDeFechar={() => origemTirar.current?.focus()}
      />

      {aviso && (
        <div className={`${classes.aviso} ${aviso.tipo === 'erro' ? classes.avisoErro : classes.avisoOk}`} role={aviso.tipo === 'erro' ? 'alert' : 'status'}>
          {aviso.tipo === 'erro' ? <IconAlertCircle size={20} aria-hidden /> : <IconCheck size={20} aria-hidden />}
          {aviso.texto}
        </div>
      )}
    </div>
  )
}
