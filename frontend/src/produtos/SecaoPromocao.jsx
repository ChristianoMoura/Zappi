import { Alert, Button, Modal, TextInput } from '@mantine/core'
import { IconAlertCircle, IconDiscount, IconDiscountOff } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { DescontoCurto } from './DescontoCurto'
import { emPromocao, lerPreco, percentualDesconto, precoParaTela, UNIDADES, validarPromocao } from './regrasProdutos'
import { aplicarPromocao, encerrarPromocao, PromocaoRecusadaError } from './servicoProdutos'
import classes from './Produtos.module.css'

// Promoção do produto (ZAP-152, ZAP-161). Vale na hora, sem salvar o formulário, como tirar do
// cardápio (ZAP-155). Sem promoção: "Aplicar desconto" abre os dois preços, com o preço antes da
// promoção já preenchido. Com promoção: os dois preços e "Encerrar promoção", com confirmação.
// O preço antes da promoção é o preço normal do produto: mudar um muda o outro (decisão proposta
// na ZAP-152). `aoMudar` recebe o produto como ficou e `aoAvisar` o texto do aviso de sucesso.
export function SecaoPromocao({ produto, aoMudar, aoAvisar }) {
  const [aberta, setAberta] = useState(false)
  const [campos, setCampos] = useState({ preco: '', precoPromocional: '' })
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [confirmarEncerrar, setConfirmarEncerrar] = useState(false)
  const refs = useRef({})
  const botao = useRef(null)
  const erroRef = useRef(null)
  const ativa = emPromocao(produto)
  const unidade = UNIDADES[produto.unidade]

  useEffect(() => {
    if (erroGeral) erroRef.current?.focus()
  }, [erroGeral])

  function abrir() {
    setCampos({ preco: precoParaTela(produto.preco), precoPromocional: '' })
    setErros({})
    setErroGeral('')
    setAberta(true)
    setTimeout(() => refs.current.precoPromocional?.focus())
  }

  function fechar() {
    setAberta(false)
    setTimeout(() => botao.current?.focus())
  }

  function mudar(campo, valor) {
    setCampos((atual) => ({ ...atual, [campo]: valor }))
    if (erros[campo]) setErros((atual) => ({ ...atual, [campo]: undefined }))
  }

  async function aplicar() {
    const novos = validarPromocao(campos)
    setErros(novos)
    setErroGeral('')
    const primeiro = ['preco', 'precoPromocional'].find((campo) => novos[campo])
    if (primeiro) {
      refs.current[primeiro]?.focus()
      return
    }
    setEnviando(true)
    try {
      const atualizado = await aplicarPromocao(produto.id, { preco: lerPreco(campos.preco), precoPromocional: lerPreco(campos.precoPromocional) })
      aoMudar(atualizado)
      setAberta(false)
      const percentual = percentualDesconto(atualizado)
      aoAvisar(`${produto.nome} está em promoção: de R$ ${precoParaTela(atualizado.preco)} por R$ ${precoParaTela(atualizado.precoPromocional)}${percentual >= 1 ? `, ${percentual}% de desconto` : ''}.`)
      setTimeout(() => botao.current?.focus())
    } catch (erro) {
      if (erro instanceof PromocaoRecusadaError && (erro.campos.preco || erro.campos.precoPromocional)) {
        setErros(erro.campos)
        refs.current[erro.campos.preco ? 'preco' : 'precoPromocional']?.focus()
      } else {
        setErroGeral('Não foi possível aplicar o desconto agora. Tente novamente em alguns minutos.')
      }
    } finally {
      setEnviando(false)
    }
  }

  async function encerrar() {
    setEnviando(true)
    setErroGeral('')
    try {
      const atualizado = await encerrarPromocao(produto.id)
      aoMudar(atualizado)
      setConfirmarEncerrar(false)
      aoAvisar(`A promoção de ${produto.nome} terminou. O preço voltou a R$ ${precoParaTela(atualizado.preco)}.`)
    } catch {
      setErroGeral('Não foi possível encerrar a promoção agora. Tente novamente em alguns minutos.')
    } finally {
      setEnviando(false)
    }
  }

  // Mesmo jeito do campo de preço do produto: rótulo visível, R$ e erro junto do campo
  const propsPreco = (campo, rotulo) => ({
    id: `promocao-${campo}`,
    ref: (el) => {
      refs.current[campo] = el
    },
    label: (
      <>
        {rotulo} <span className={classes.marca}>obrigatório</span>
      </>
    ),
    value: campos[campo],
    onChange: (e) => mudar(campo, e.currentTarget.value),
    onBlur: () => {
      const valor = lerPreco(campos[campo])
      if (valor > 0) mudar(campo, precoParaTela(valor))
    },
    error: erros[campo],
    'aria-required': true,
    leftSection: <span className={classes.prefixo}>R$</span>,
    leftSectionWidth: 48,
    inputMode: 'decimal',
    autoComplete: 'off',
    placeholder: '0,00',
    maxLength: 14,
    inputWrapperOrder: ['label', 'input', 'error'],
    classNames: { label: classes.rotulo, input: classes.campo, error: classes.erroCampo },
  })

  return (
    <section className={classes.promocao} aria-labelledby="secao-promocao">
      <h2 id="secao-promocao" className={classes.tituloCaixa}>
        Promoção
      </h2>

      {ativa ? (
        <>
          <p className={classes.precosPromocao}>
            De <s>R$ {precoParaTela(produto.preco)}</s> por <strong>R$ {precoParaTela(produto.precoPromocional)}</strong>{' '}
            <span className={classes.unidadeEDesconto}>
              {unidade.selo}
              <DescontoCurto produto={produto} />
            </span>
          </p>
          <p className={classes.dica}>Os pedidos novos usam o preço com desconto. Os pedidos já feitos não mudam.</p>
          <Button ref={botao} variant="outline" color="#b42318" onClick={() => { setErroGeral(''); setConfirmarEncerrar(true) }} leftSection={<IconDiscountOff size={22} aria-hidden />}>
            Encerrar promoção
          </Button>
        </>
      ) : aberta ? (
        <form
          noValidate
          className={classes.formPromocao}
          onSubmit={(evento) => {
            evento.preventDefault()
            void aplicar()
          }}
        >
          <div className={classes.camposPromocao}>
            <TextInput {...propsPreco('preco', `Preço antes da promoção (${unidade.selo})`)} />
            <TextInput {...propsPreco('precoPromocional', `Preço com desconto (${unidade.selo})`)} />
          </div>
          <p className={classes.dica}>Mudar o preço antes da promoção muda também o preço normal do produto.</p>
          <div className={classes.botoesPromocao}>
            <Button type="submit" loading={enviando} loaderProps={{ type: 'dots' }} leftSection={<IconDiscount size={22} aria-hidden />}>
              Aplicar desconto
            </Button>
            <Button variant="outline" onClick={fechar} disabled={enviando}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p className={classes.dica}>Sem promoção. Com o desconto, o cardápio mostra o preço novo e o antigo riscado.</p>
          <Button ref={botao} variant="outline" onClick={abrir} leftSection={<IconDiscount size={22} aria-hidden />}>
            Aplicar desconto
          </Button>
        </>
      )}

      {erroGeral && !confirmarEncerrar && (
        <Alert ref={erroRef} tabIndex={-1} color="#b42318" variant="outline" icon={<IconAlertCircle size={22} aria-hidden />} className={classes.erroPromocao} role="alert">
          {erroGeral}
        </Alert>
      )}

      <Modal
        opened={confirmarEncerrar}
        onClose={() => !enviando && setConfirmarEncerrar(false)}
        title="Encerrar a promoção?"
        centered
        size="lg"
        returnFocus={false}
        closeButtonProps={{ 'aria-label': 'Fechar sem encerrar a promoção', size: 'xl' }}
        classNames={{ title: classes.tituloJanela }}
        onExitTransitionEnd={() => botao.current?.focus()}
      >
        <div className={classes.janela}>
          <p>
            {produto.nome} volta ao preço normal, R$ {precoParaTela(produto.preco)} {unidade.selo}, no cardápio e nos pedidos novos. Os pedidos já feitos não mudam.
          </p>
          {erroGeral && (
            <Alert ref={erroRef} tabIndex={-1} color="#b42318" variant="outline" icon={<IconAlertCircle size={22} aria-hidden />} className={classes.erroJanela} role="alert">
              {erroGeral}
            </Alert>
          )}
          <div className={classes.botoesJanela}>
            {/* O foco começa em "Manter a promoção": um Enter sem querer não encerra nada */}
            <Button data-autofocus variant="outline" size="lg" onClick={() => setConfirmarEncerrar(false)} disabled={enviando}>
              Manter a promoção
            </Button>
            <Button size="lg" color="#b42318" onClick={encerrar} loading={enviando} loaderProps={{ type: 'dots' }} leftSection={<IconDiscountOff size={22} aria-hidden />}>
              Encerrar promoção
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  )
}
