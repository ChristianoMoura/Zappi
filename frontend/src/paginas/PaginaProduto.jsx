import { Alert, Button, Loader, SegmentedControl, Textarea, TextInput } from '@mantine/core'
import { IconAlertCircle, IconCamera, IconCheck, IconChevronLeft, IconInfoCircle, IconTrash } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { TIPOS_FOTO, validarFoto } from '../comum/regrasFoto'
import { LIMITES, lerPreco, nomeCompleto, ORDEM_CAMPOS, precoParaTela, sugerirTextoAlternativo, UNIDADES, validarProduto } from '../produtos/regrasProdutos'
import { buscarProduto, ProdutoNaoEncontradoError, salvarProduto } from '../produtos/servicoProdutos'
import classes from '../produtos/Produtos.module.css'
import { useTituloPagina } from './useTituloPagina'

const VAZIO = { nome: 'Bolo', sabor: '', unidade: 'KG', preco: '', descricao: '', foto: '', textoAlternativo: '' }

const paraTela = (produto) => ({ ...produto, preco: precoParaTela(produto.preco) })

// Cadastro e edição de produto (ZAP-42, US3, RF05, RF06). Ordem dos campos: nome → sabor →
// vendido por → preço → descrição → foto → "Salvar" (NBR 17225 5.1.4). A foto é opcional; com
// foto, a descrição dela é obrigatória (RN15) e já vem sugerida com o nome e o sabor.
export function PaginaProduto() {
  const { id } = useParams()
  const editando = id !== undefined
  useTituloPagina(editando ? 'Editar produto' : 'Cadastrar produto')
  const navegar = useNavigate()
  const [original, setOriginal] = useState(null)
  const [dados, setDados] = useState(editando ? null : VAZIO)
  const [erros, setErros] = useState({})
  const [carregando, setCarregando] = useState(editando)
  const [erroCarregar, setErroCarregar] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState(null)
  const refs = useRef({})
  const titulo = useRef(null)
  const arquivo = useRef(null)
  const botaoFoto = useRef(null)

  useEffect(() => {
    if (!editando) return undefined
    let ativo = true
    buscarProduto(Number(id))
      .then((produto) => {
        if (!ativo) return
        setOriginal(produto)
        setDados(paraTela(produto))
      })
      .catch((erro) => {
        if (ativo) setErroCarregar(erro instanceof ProdutoNaoEncontradoError ? 'Este produto não está mais no cardápio.' : 'Não foi possível carregar o produto agora. Tente novamente em alguns minutos.')
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [editando, id])

  // Ao abrir, o foco vai para o título, que diz em que tela a Lídia está
  useEffect(() => {
    if (!carregando) titulo.current?.focus()
  }, [carregando])

  useEffect(() => {
    if (!aviso) return undefined
    const tempo = setTimeout(() => setAviso(null), 4000)
    return () => clearTimeout(tempo)
  }, [aviso])

  const voltar = () => navegar('/produtos', { state: editando ? { foco: `produto-${id}` } : { foco: 'cadastrar' } })

  if (carregando) {
    return (
      <div className={classes.estado} role="status">
        <Loader color="zappi" type="dots" />
        Carregando o produto…
      </div>
    )
  }

  if (erroCarregar) {
    return (
      <div className={classes.pagina}>
        <Alert color="#b42318" variant="outline" icon={<IconAlertCircle size={22} aria-hidden />} className={classes.erroCarregar}>
          {erroCarregar}
        </Alert>
        <Button component={Link} to="/produtos" variant="outline" size="lg" className={classes.voltarLista}>
          Voltar para os produtos
        </Button>
      </div>
    )
  }

  function mudar(campo, valor) {
    setDados((atual) => ({ ...atual, [campo]: valor }))
    if (erros[campo]) setErros((atual) => { const resto = { ...atual }; delete resto[campo]; return resto })
  }

  // A prévia aparece na hora; a descrição da foto vem sugerida se estiver vazia
  function escolherFoto(evento) {
    const escolhido = evento.currentTarget.files?.[0]
    evento.currentTarget.value = ''
    if (!escolhido) return
    const problema = validarFoto(escolhido)
    if (problema) {
      setErros((atual) => ({ ...atual, foto: problema }))
      return
    }
    setErros((atual) => { const resto = { ...atual }; delete resto.foto; return resto })
    setDados((atual) => ({ ...atual, foto: URL.createObjectURL(escolhido), textoAlternativo: atual.textoAlternativo.trim() ? atual.textoAlternativo : sugerirTextoAlternativo(atual) }))
    setAviso({ tipo: 'ok', texto: 'Foto escolhida. Confira a descrição da foto.' })
    setTimeout(() => botaoFoto.current?.focus())
  }

  function removerFoto() {
    setDados((atual) => ({ ...atual, foto: '', textoAlternativo: '' }))
    setErros((atual) => { const resto = { ...atual }; delete resto.textoAlternativo; return resto })
    setTimeout(() => botaoFoto.current?.focus())
  }

  async function salvar() {
    const novosErros = validarProduto(dados)
    setErros(novosErros)
    const primeiro = ORDEM_CAMPOS.find((campo) => novosErros[campo])
    if (primeiro) {
      refs.current[primeiro]?.focus()
      return
    }
    setSalvando(true)
    try {
      const salvo = await salvarProduto({
        ...(editando ? { id: Number(id) } : {}),
        nome: dados.nome.trim(),
        sabor: dados.sabor.trim(),
        unidade: dados.unidade,
        preco: lerPreco(dados.preco),
        descricao: dados.descricao.trim(),
        foto: dados.foto,
        textoAlternativo: dados.textoAlternativo.trim(),
      })
      navegar('/produtos', { state: { salvo: { id: salvo.id, novo: !editando, nome: nomeCompleto(salvo) } } })
    } catch {
      setSalvando(false)
      setAviso({ tipo: 'erro', texto: 'Não foi possível salvar agora. Tente novamente em alguns minutos.' })
    }
  }

  // Ao editar, o preço novo vale só para os pedidos novos (RN10)
  const precoDigitado = lerPreco(dados.preco)
  const mudouPreco = editando && original && precoDigitado > 0 && precoDigitado !== original.preco
  const unidade = UNIDADES[dados.unidade]

  // Campo com rótulo sempre visível, marca de obrigatório ou opcional e erro ligado ao campo
  const propsCampo = (campo, rotulo, { obrigatorio = false, dica } = {}) => ({
    id: `produto-${campo}`,
    ref: (el) => {
      refs.current[campo] = el
    },
    label: (
      <>
        {rotulo} <span className={classes.marca}>{obrigatorio ? 'obrigatório' : 'opcional'}</span>
      </>
    ),
    description: dica,
    error: erros[campo],
    'aria-required': obrigatorio || undefined,
    maxLength: LIMITES[campo],
    inputWrapperOrder: ['label', 'description', 'input', 'error'],
    classNames: { label: classes.rotulo, input: classes.campo, error: classes.erroCampo, description: classes.dica },
  })

  return (
    <div className={classes.pagina}>
      <div className={classes.formTopo}>
        <Button variant="subtle" onClick={voltar} leftSection={<IconChevronLeft size={22} aria-hidden />} className={classes.voltar}>
          Produtos
        </Button>
        <h1 ref={titulo} className={classes.titulo} tabIndex={-1}>
          {editando ? `Editar ${nomeCompleto(original).toLowerCase()}` : 'Cadastrar produto'}
        </h1>
        <p className={classes.subtitulo}>{editando ? 'Mude o que precisar e salve.' : 'Preencha os dados do produto. Ele aparece na lista para escolher nos pedidos.'}</p>
      </div>

      <form
        className={classes.formulario}
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault()
          void salvar()
        }}
      >
        <div className={classes.formGrade}>
          <section className={classes.caixa} aria-labelledby="secao-produto">
            <h2 id="secao-produto" className={classes.tituloCaixa}>Sobre o produto</h2>
            <TextInput {...propsCampo('nome', 'Nome', { obrigatorio: true, dica: 'O tipo de produto. Ex.: Bolo ou Salgado.' })} value={dados.nome} onChange={(e) => mudar('nome', e.currentTarget.value)} autoComplete="off" />
            <TextInput {...propsCampo('sabor', 'Sabor', { obrigatorio: true, dica: 'Ex.: Brigadeiro de chocolate ou Coxinha de frango.' })} value={dados.sabor} onChange={(e) => mudar('sabor', e.currentTarget.value)} autoComplete="off" />
            <fieldset className={classes.grupo}>
              <legend className={classes.rotulo}>
                Vendido por <span className={classes.marca}>obrigatório</span>
              </legend>
              <SegmentedControl
                fullWidth
                size="lg"
                color="zappi"
                value={dados.unidade}
                onChange={(valor) => mudar('unidade', valor)}
                data={Object.entries(UNIDADES).map(([valor, u]) => ({ value: valor, label: u.rotuloOpcao }))}
                className={classes.unidades}
              />
              <p className={classes.dica}>{unidade.dica}</p>
            </fieldset>
            <TextInput
              {...propsCampo('preco', unidade.rotuloPreco, { obrigatorio: true })}
              value={dados.preco}
              onChange={(e) => mudar('preco', e.currentTarget.value)}
              onBlur={() => {
                const valor = lerPreco(dados.preco)
                if (valor > 0) mudar('preco', precoParaTela(valor))
              }}
              leftSection={<span className={classes.prefixo}>R$</span>}
              leftSectionWidth={48}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,00"
              maxLength={14}
              aria-describedby={mudouPreco ? 'aviso-preco' : undefined}
            />
            {mudouPreco && (
              <p className={classes.notaPreco} id="aviso-preco">
                <IconInfoCircle size={22} aria-hidden />
                Os pedidos já feitos continuam com R$ {precoParaTela(original.preco)}. O novo preço vale para os pedidos novos.
              </p>
            )}
            <Textarea
              {...propsCampo('descricao', 'Descrição', { dica: 'Massa, recheio, cobertura ou o que ajudar o cliente a escolher.' })}
              value={dados.descricao}
              onChange={(e) => mudar('descricao', e.currentTarget.value)}
              autosize
              minRows={3}
              classNames={{ label: classes.rotulo, input: classes.campoTexto, error: classes.erroCampo, description: classes.dica }}
            />
          </section>

          <section className={classes.caixa} aria-labelledby="secao-foto">
            <h2 id="secao-foto" className={classes.tituloCaixa}>Foto do produto</h2>
            {dados.foto ? (
              <div className={`${classes.areaFoto} ${classes.comFoto}`}>
                <div className={classes.previa}>
                  <img src={dados.foto} alt="" />
                </div>
                <div className={classes.botoesFoto}>
                  <Button ref={botaoFoto} variant="outline" onClick={() => arquivo.current?.click()} leftSection={<IconCamera size={22} aria-hidden />}>
                    Trocar foto
                  </Button>
                  <Button variant="subtle" color="#b42318" onClick={removerFoto} leftSection={<IconTrash size={22} aria-hidden />}>
                    Remover foto
                  </Button>
                </div>
              </div>
            ) : (
              <div className={classes.areaFoto}>
                <IconCamera size={48} stroke={1.5} aria-hidden className={classes.iconeFoto} />
                <p>A foto é opcional, mas ajuda o cliente a escolher.</p>
                <Button ref={botaoFoto} variant="outline" onClick={() => arquivo.current?.click()} leftSection={<IconCamera size={22} aria-hidden />} aria-describedby="foto-dica foto-erro">
                  Escolher foto
                </Button>
                <p id="foto-dica">JPG, PNG ou WebP de até 5 MB.</p>
              </div>
            )}
            <p id="foto-erro" className={classes.erroFoto} role={erros.foto ? 'alert' : undefined}>
              {erros.foto ? (
                <>
                  <IconAlertCircle size={20} aria-hidden /> {erros.foto}
                </>
              ) : null}
            </p>
            <input ref={arquivo} type="file" accept={TIPOS_FOTO.join(',')} hidden onChange={escolherFoto} data-testid="arquivo-foto" />
            {dados.foto && (
              <TextInput
                {...propsCampo('textoAlternativo', 'Descrição da foto', {
                  obrigatorio: true,
                  dica: 'Conte o que aparece na foto, para quem usa leitor de tela. Ex.: Bolo de brigadeiro coberto com granulado.',
                })}
                value={dados.textoAlternativo}
                onChange={(e) => mudar('textoAlternativo', e.currentTarget.value)}
                autoComplete="off"
              />
            )}
          </section>
        </div>

        <div className={classes.formAcoes}>
          <Button variant="outline" size="lg" onClick={voltar} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" size="lg" loading={salvando} loaderProps={{ type: 'dots' }} leftSection={<IconCheck size={22} aria-hidden />}>
            {editando ? 'Salvar alterações' : 'Salvar produto'}
          </Button>
        </div>
      </form>

      {aviso && (
        <div className={`${classes.aviso} ${aviso.tipo === 'ok' ? classes.avisoOk : classes.avisoErro}`} role={aviso.tipo === 'ok' ? 'status' : 'alert'}>
          {aviso.tipo === 'ok' ? <IconCheck size={20} aria-hidden /> : <IconAlertCircle size={20} aria-hidden />}
          {aviso.texto}
        </div>
      )}
    </div>
  )
}
