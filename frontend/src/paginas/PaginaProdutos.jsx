import { Alert, Button, Loader, Modal } from '@mantine/core'
import { IconAlertCircle, IconCheck, IconPlus, IconTrash } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { CartaoProduto } from '../produtos/CartaoProduto'
import { nomeCompleto } from '../produtos/regrasProdutos'
import { buscarProdutos, excluirProduto } from '../produtos/servicoProdutos'
import classes from '../produtos/Produtos.module.css'
import { useTituloPagina } from './useTituloPagina'

// Lista de produtos do cardápio (ZAP-41, US3, RF05, RF06). Mostra só os ativos; excluir pede
// confirmação e é lógico (RN14). Cadastrar e editar abrem o formulário da ZAP-42.
export function PaginaProdutos() {
  useTituloPagina('Produtos')
  const { state } = useLocation()
  const [produtos, setProdutos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erroCarregar, setErroCarregar] = useState(false)
  const [paraExcluir, setParaExcluir] = useState(null)
  const [excluindo, setExcluindo] = useState(false)
  const [erroExcluir, setErroExcluir] = useState('')
  // Voltando do formulário depois de salvar, a lista já abre com o aviso e o cartão destacado
  const salvo = state?.salvo
  const foco = state?.foco
  const [aviso, setAviso] = useState(() => (salvo ? (salvo.novo ? `${salvo.nome} entrou no cardápio.` : 'Alterações salvas.') : null))
  const destaque = salvo?.id ?? null
  const titulo = useRef(null)
  const origemExclusao = useRef(null)

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
        Não foi possível carregar os produtos agora. Tente de novo em alguns minutos.
      </Alert>
    )
  }

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
      setAviso(`${nomeCompleto(paraExcluir)} saiu do cardápio.`)
      origemExclusao.current = titulo.current
      setParaExcluir(null)
    } catch {
      setErroExcluir('Não foi possível excluir agora. Tente de novo em alguns minutos.')
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <div className={classes.pagina}>
      <div className={classes.cabecalho}>
        <div>
          <h1 ref={titulo} className={classes.titulo} tabIndex={-1}>
            Produtos
          </h1>
          <p className={classes.subtitulo}>Os produtos que aparecem nos pedidos.</p>
        </div>
        <Button component={Link} to="/produtos/novo" id="cadastrar" size="lg" leftSection={<IconPlus size={22} aria-hidden />} className={classes.cadastrar}>
          Cadastrar produto
        </Button>
      </div>

      {produtos.length > 0 ? (
        <>
          <p className={classes.contagem}>
            {produtos.length} {produtos.length === 1 ? 'produto' : 'produtos'} no cardápio
          </p>
          <div className={classes.grade}>
            {produtos.map((produto) => (
              <CartaoProduto key={produto.id} produto={produto} destaque={destaque === produto.id} aoExcluir={pedirExclusao} />
            ))}
          </div>
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
        title={paraExcluir ? `Excluir ${nomeCompleto(paraExcluir).toLowerCase()}?` : ''}
        centered
        size="lg"
        returnFocus={false}
        onExitTransitionEnd={() => origemExclusao.current?.focus()}
        closeButtonProps={{ 'aria-label': 'Fechar sem excluir', size: 'xl' }}
        classNames={{ title: classes.tituloJanela }}
      >
        <div className={classes.janela}>
          <p>Ele sai do cardápio e não pode ser escolhido em pedidos novos. Os pedidos que já têm este produto continuam como estão.</p>
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
              Excluir do cardápio
            </Button>
          </div>
        </div>
      </Modal>

      {aviso && (
        <div className={`${classes.aviso} ${classes.avisoOk}`} role="status">
          <IconCheck size={20} aria-hidden />
          {aviso}
        </div>
      )}
    </div>
  )
}
