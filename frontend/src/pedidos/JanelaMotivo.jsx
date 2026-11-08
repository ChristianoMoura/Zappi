import { Alert, Button, Modal, Textarea } from '@mantine/core'
import { IconAlertCircle, IconX } from '@tabler/icons-react'
import { useState } from 'react'
import { MOTIVO_MAXIMO, STATUS } from './regrasPedidos'
import classes from './QuadroPedidos.module.css'

function explicacao(pedido, cancelar) {
  const aviso = 'vai para Recusados e o Zappi prepara uma mensagem avisando o cliente.'
  if (!cancelar) return `Ao recusar, o pedido de ${pedido.cliente.nome} ${aviso}`
  const etapa = pedido.status === STATUS.CONFIRMADO ? 'confirmado' : 'em produção'
  return `O pedido de ${pedido.cliente.nome} já estava ${etapa}. Ao cancelar, ele ${aviso}`
}

// Janela que pede o motivo antes de recusar ou cancelar (ZAP-54, RF11, RN05). Ela mesma é a
// confirmação: nada muda até a Lídia escrever o motivo e apertar o botão vermelho.
export function JanelaMotivo({ pedido, acao, aberta, aoFechar, aoConcluir, enviando, erro: erroServico }) {
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState('')
  const cancelar = acao === 'cancelar'
  const primeiroNome = pedido?.cliente.nome.split(' ')[0]
  const textoBotao = cancelar ? 'Cancelar pedido' : 'Recusar pedido'

  function fechar() {
    setMotivo('')
    setErro('')
    aoFechar()
  }

  function concluir(evento) {
    evento.preventDefault()
    if (!motivo.trim()) {
      setErro(`Escreva o motivo. ${primeiroNome} vai receber essa explicação no WhatsApp.`)
      return
    }
    aoConcluir(motivo.trim())
  }

  return (
    <Modal
      opened={aberta}
      onClose={() => !enviando && fechar()}
      title={pedido ? `${textoBotao} #${pedido.numero}` : ''}
      centered
      zIndex={400}
      size="lg"
      closeButtonProps={{ 'aria-label': 'Voltar sem mudar o pedido', size: 'xl' }}
      classNames={{ title: classes.detalhesTitulo }}
      onExitTransitionEnd={() => {
        setMotivo('')
        setErro('')
      }}
    >
      {pedido && (
        <form onSubmit={concluir} noValidate className={classes.formMotivo}>
          <p className={classes.explicacaoMotivo}>{explicacao(pedido, cancelar)}</p>
          <Textarea
            data-autofocus
            id="motivo-recusa"
            label={
              <>
                Motivo <span className={classes.obrigatorio}>(obrigatório)</span>
              </>
            }
            description={`${primeiroNome} vai ler este motivo na mensagem. Ex.: Agenda cheia nesse dia.`}
            value={motivo}
            onChange={(e) => {
              setMotivo(e.currentTarget.value)
              if (erro) setErro('')
            }}
            error={erro}
            aria-required
            maxLength={MOTIVO_MAXIMO}
            autosize
            minRows={3}
            classNames={{ label: classes.rotuloMotivo, description: classes.dicaMotivo, error: classes.erroMotivo }}
          />
          {erroServico && (
            <Alert color="#b42318" variant="outline" icon={<IconAlertCircle size={22} aria-hidden />} className={classes.erroAcao} role="alert">
              {erroServico}
            </Alert>
          )}
          <span className={classes.contadorMotivo} aria-live="polite">
            {motivo.length}/{MOTIVO_MAXIMO}
          </span>
          <div className={classes.botoesMotivo}>
            <Button type="submit" color="#b42318" loading={enviando} loaderProps={{ type: 'dots' }} leftSection={<IconX size={22} aria-hidden />}>
              {textoBotao}
            </Button>
            <Button type="button" variant="outline" onClick={fechar} disabled={enviando}>
              Voltar
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
