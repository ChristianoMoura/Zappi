import { Alert, Button, Checkbox, Loader, NativeSelect, Textarea, TextInput } from '@mantine/core'
import { IconAlertCircle, IconCheck, IconChevronLeft, IconPlus, IconTrash } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { mascaraTelefone, soDigitos } from '../estabelecimento/regrasEstabelecimento'
import { itemVazio, LIMITES, montarPedido, ordemDosCampos, subtotalDoItem, totalDoFormulario, validarPedido } from '../pedidos/regrasCadastroPedido'
import { dataLocal, moeda } from '../pedidos/regrasPedidos'
import { cadastrarPedido } from '../pedidos/servicoPedidos'
import { nomeCompleto, precoParaTela, UNIDADES } from '../produtos/regrasProdutos'
import { buscarProdutos } from '../produtos/servicoProdutos'
import formulario from '../produtos/Produtos.module.css'
import classes from '../pedidos/NovoPedido.module.css'
import { useTituloPagina } from './useTituloPagina'

const VAZIO = () => ({ clienteNome: '', clienteWhatsapp: '', consentimentoLgpd: false, itens: [itemVazio()], dataRetirada: '', observacao: '' })

// Cadastro de pedido pela Lídia (ZAP-89, US7, RF13): ela registra a encomenda que recebeu pelo
// WhatsApp. Ordem dos campos: cliente → itens → data de retirada → observações → "Salvar"
// (NBR 17225 5.1.4). Os produtos vêm do cardápio, e o total é calculado na tela (RN11, RN14).
export function PaginaNovoPedido() {
  useTituloPagina('Novo pedido')
  const navegar = useNavigate()
  const [produtos, setProdutos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erroCarregar, setErroCarregar] = useState(false)
  const [dados, setDados] = useState(VAZIO)
  const [erros, setErros] = useState({})
  const [salvando, setSalvando] = useState(false)
  const [erroSalvar, setErroSalvar] = useState('')
  const [hoje] = useState(() => dataLocal(new Date()))
  const refs = useRef({})
  const titulo = useRef(null)
  const botaoAdicionar = useRef(null)

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

  useEffect(() => {
    if (!carregando) titulo.current?.focus()
  }, [carregando])

  if (carregando) {
    return (
      <div className={formulario.estado} role="status">
        <Loader color="zappi" type="dots" />
        Carregando os produtos do cardápio…
      </div>
    )
  }

  const voltar = () => navegar('/pedidos', { state: { foco: 'novo-pedido' } })

  if (erroCarregar || produtos.length === 0) {
    return (
      <div className={formulario.pagina}>
        <Alert color="#b42318" variant="outline" icon={<IconAlertCircle size={22} aria-hidden />} className={formulario.erroCarregar}>
          {erroCarregar
            ? 'Não foi possível carregar os produtos do cardápio agora. Tente de novo em alguns minutos.'
            : 'O cardápio está vazio. Cadastre pelo menos um produto antes de registrar um pedido.'}
        </Alert>
        <Button component={Link} to={erroCarregar ? '/pedidos' : '/produtos/novo'} variant="outline" size="lg" className={formulario.voltarLista}>
          {erroCarregar ? 'Voltar para os pedidos' : 'Cadastrar produto'}
        </Button>
      </div>
    )
  }

  const limparErro = (campo) => {
    if (erros[campo]) setErros((atual) => { const resto = { ...atual }; delete resto[campo]; return resto })
  }

  function mudar(campo, valor) {
    setDados((atual) => ({ ...atual, [campo]: valor }))
    limparErro(campo)
  }

  function mudarItem(chave, campo, valor) {
    setDados((atual) => ({ ...atual, itens: atual.itens.map((item) => (item.chave === chave ? { ...item, [campo]: valor } : item)) }))
    limparErro(`item-${chave}-${campo === 'produtoId' ? 'produto' : campo}`)
  }

  // Item novo: o foco vai direto para a escolha do produto
  function adicionarItem() {
    const novo = itemVazio()
    setDados((atual) => ({ ...atual, itens: [...atual.itens, novo] }))
    setTimeout(() => refs.current[`item-${novo.chave}-produto`]?.focus())
  }

  function removerItem(chave) {
    setDados((atual) => ({ ...atual, itens: atual.itens.filter((item) => item.chave !== chave) }))
    setTimeout(() => botaoAdicionar.current?.focus())
  }

  async function salvar() {
    const novosErros = validarPedido(dados, produtos)
    setErros(novosErros)
    setErroSalvar('')
    const primeiro = ordemDosCampos(dados.itens).find((campo) => novosErros[campo])
    if (primeiro) {
      refs.current[primeiro]?.focus()
      return
    }
    setSalvando(true)
    try {
      const pedido = await cadastrarPedido(montarPedido(dados, produtos))
      navegar('/pedidos', { state: { novo: { numero: pedido.numero, cliente: pedido.cliente.nome } } })
    } catch {
      setSalvando(false)
      setErroSalvar('Não foi possível salvar o pedido agora. Tente de novo em alguns minutos.')
    }
  }

  const total = totalDoFormulario(dados.itens, produtos)
  const opcoes = [
    { value: '', label: 'Escolha o produto' },
    ...produtos.map((p) => ({ value: String(p.id), label: `${nomeCompleto(p)} · R$ ${precoParaTela(p.preco)} ${UNIDADES[p.unidade].selo}` })),
  ]

  // Campo com rótulo sempre visível, marca de obrigatório ou opcional e erro ligado ao campo
  const propsCampo = (campo, rotulo, { obrigatorio = false, dica, limite } = {}) => ({
    id: `pedido-${campo}`,
    ref: (el) => {
      refs.current[campo] = el
    },
    label: (
      <>
        {rotulo} <span className={formulario.marca}>{obrigatorio ? 'obrigatório' : 'opcional'}</span>
      </>
    ),
    description: dica,
    error: erros[campo],
    'aria-required': obrigatorio || undefined,
    maxLength: limite,
    inputWrapperOrder: ['label', 'description', 'input', 'error'],
    classNames: { label: formulario.rotulo, input: formulario.campo, error: formulario.erroCampo, description: formulario.dica },
  })

  return (
    <div className={formulario.pagina}>
      <div className={formulario.formTopo}>
        <Button variant="subtle" onClick={voltar} leftSection={<IconChevronLeft size={22} aria-hidden />} className={formulario.voltar}>
          Pedidos
        </Button>
        <h1 ref={titulo} className={formulario.titulo} tabIndex={-1}>
          Novo pedido
        </h1>
        <p className={formulario.subtitulo}>Registre a encomenda que chegou pelo WhatsApp. Ela entra na coluna Novo.</p>
      </div>

      <form
        className={`${formulario.formulario} ${classes.formulario}`}
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault()
          void salvar()
        }}
      >
        <section className={formulario.caixa} aria-labelledby="secao-cliente">
          <h2 id="secao-cliente" className={formulario.tituloCaixa}>Cliente</h2>
          <div className={classes.duasColunas}>
            <TextInput {...propsCampo('clienteNome', 'Nome do cliente', { obrigatorio: true, limite: LIMITES.clienteNome })} value={dados.clienteNome} onChange={(e) => mudar('clienteNome', e.currentTarget.value)} autoComplete="off" />
            <TextInput
              {...propsCampo('clienteWhatsapp', 'WhatsApp', { obrigatorio: true })}
              value={mascaraTelefone(dados.clienteWhatsapp)}
              onChange={(e) => mudar('clienteWhatsapp', soDigitos(e.currentTarget.value).slice(0, 11))}
              leftSection={<span className={formulario.prefixo}>+55</span>}
              leftSectionWidth={56}
              inputMode="tel"
              autoComplete="off"
              maxLength={15}
              placeholder="(11) 90000-0000"
            />
          </div>
          <Checkbox
            id="pedido-consentimentoLgpd"
            ref={(el) => {
              refs.current.consentimentoLgpd = el
            }}
            size="md"
            checked={dados.consentimentoLgpd}
            onChange={(e) => mudar('consentimentoLgpd', e.currentTarget.checked)}
            label="O cliente autorizou guardar o nome e o WhatsApp para os avisos deste pedido."
            description="Exigido pela LGPD. O WhatsApp só é usado para avisar sobre o pedido."
            error={erros.consentimentoLgpd}
            classNames={{ label: classes.rotuloCaixa, description: formulario.dica, error: formulario.erroCampo }}
          />
        </section>

        <section className={formulario.caixa} aria-labelledby="secao-itens">
          <h2 id="secao-itens" className={formulario.tituloCaixa}>Itens</h2>
          <ol className={classes.itens}>
            {dados.itens.map((item, indice) => {
              const produto = produtos.find((p) => String(p.id) === String(item.produtoId))
              const sub = subtotalDoItem(item, produtos)
              const numero = indice + 1
              return (
                <li key={item.chave} className={classes.item} aria-labelledby={`item-${item.chave}-titulo`}>
                  <div className={classes.itemTopo}>
                    <h3 id={`item-${item.chave}-titulo`} className={classes.itemTitulo}>Item {numero}</h3>
                    {dados.itens.length > 1 && (
                      <Button variant="subtle" color="#b42318" onClick={() => removerItem(item.chave)} leftSection={<IconTrash size={20} aria-hidden />} aria-label={`Remover item ${numero}`}>
                        Remover
                      </Button>
                    )}
                  </div>
                  <div className={classes.produtoQuantidade}>
                    <NativeSelect
                      {...propsCampo(`item-${item.chave}-produto`, 'Produto', { obrigatorio: true })}
                      data={opcoes}
                      value={item.produtoId}
                      onChange={(e) => mudarItem(item.chave, 'produtoId', e.currentTarget.value)}
                    />
                    <TextInput
                      {...propsCampo(`item-${item.chave}-quantidade`, 'Quantidade', { obrigatorio: true })}
                      value={item.quantidade}
                      onChange={(e) => mudarItem(item.chave, 'quantidade', e.currentTarget.value)}
                      rightSection={<span className={formulario.prefixo}>{produto?.unidade === 'UN' ? 'un' : 'kg'}</span>}
                      rightSectionWidth={44}
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder={produto?.unidade === 'UN' ? 'Ex.: 50' : 'Ex.: 1,5'}
                      maxLength={9}
                    />
                  </div>
                  <p className={classes.subtotal} aria-live="polite">
                    {produto ? (
                      <>
                        Subtotal <strong>{moeda(sub)}</strong>
                        <span className={classes.conta}>
                          {' '}· R$ {precoParaTela(produto.preco)} {UNIDADES[produto.unidade].selo}
                        </span>
                      </>
                    ) : (
                      'Escolha o produto para ver o preço.'
                    )}
                  </p>
                  <div className={classes.duasColunas}>
                    <TextInput {...propsCampo(`item-${item.chave}-recheio`, 'Recheio', { limite: LIMITES.recheio })} value={item.recheio} onChange={(e) => mudarItem(item.chave, 'recheio', e.currentTarget.value)} autoComplete="off" />
                    <TextInput {...propsCampo(`item-${item.chave}-cobertura`, 'Cobertura', { limite: LIMITES.cobertura })} value={item.cobertura} onChange={(e) => mudarItem(item.chave, 'cobertura', e.currentTarget.value)} autoComplete="off" />
                  </div>
                  <TextInput
                    {...propsCampo(`item-${item.chave}-observacao`, 'Observação do item', { dica: 'Ex.: massa branca ou escrever "Parabéns, Lia".', limite: LIMITES.observacaoItem })}
                    value={item.observacao}
                    onChange={(e) => mudarItem(item.chave, 'observacao', e.currentTarget.value)}
                    autoComplete="off"
                  />
                </li>
              )
            })}
          </ol>
          <Button ref={botaoAdicionar} variant="outline" onClick={adicionarItem} leftSection={<IconPlus size={22} aria-hidden />} className={classes.adicionar}>
            Adicionar outro item
          </Button>
        </section>

        <section className={formulario.caixa} aria-labelledby="secao-retirada">
          <h2 id="secao-retirada" className={formulario.tituloCaixa}>Retirada</h2>
          <TextInput
            {...propsCampo('dataRetirada', 'Data de retirada', { obrigatorio: true, dica: 'Não há entrega: o cliente retira e paga na retirada.' })}
            type="date"
            min={hoje}
            value={dados.dataRetirada}
            onChange={(e) => mudar('dataRetirada', e.currentTarget.value)}
            className={classes.data}
          />
          <Textarea
            {...propsCampo('observacao', 'Observações do pedido', { dica: 'Ocasião ou tema da festa. Ex.: Aniversário de 40 anos.', limite: LIMITES.observacao })}
            value={dados.observacao}
            onChange={(e) => mudar('observacao', e.currentTarget.value)}
            autosize
            minRows={2}
            classNames={{ label: formulario.rotulo, input: formulario.campoTexto, error: formulario.erroCampo, description: formulario.dica }}
          />
        </section>

        {erroSalvar && (
          <Alert color="#b42318" variant="outline" icon={<IconAlertCircle size={22} aria-hidden />} className={formulario.erroJanela} role="alert">
            {erroSalvar}
          </Alert>
        )}

        <div className={`${formulario.formAcoes} ${classes.acoes}`}>
          <p className={classes.total} aria-live="polite">
            <span>Total</span>
            <strong>{moeda(total)}</strong>
          </p>
          <Button variant="outline" size="lg" onClick={voltar} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" size="lg" loading={salvando} loaderProps={{ type: 'dots' }} leftSection={<IconCheck size={22} aria-hidden />}>
            Salvar pedido
          </Button>
        </div>
      </form>
    </div>
  )
}
