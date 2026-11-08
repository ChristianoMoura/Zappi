import { Alert, Button, Modal } from '@mantine/core'
import { IconAlertCircle, IconArrowBackUp, IconBrandWhatsapp } from '@tabler/icons-react'
import { avisoDeProntoEnviado, COLUNAS, VOLTA } from './regrasPedidos'
import classes from './QuadroPedidos.module.css'

// Confirmação antes de voltar o pedido uma coluna (ZAP-77, decisão da ZAP-64). Se o cliente já
// recebeu o aviso de pronto, a janela lembra a Lídia de avisar que o pedido voltou para produção.
export function JanelaVoltar({ pedido, aberta, aoFechar, aoConfirmar, enviando, erro }) {
  const volta = pedido && VOLTA[pedido.status]
  const destino = volta && COLUNAS.find((c) => c.status === volta.destino).nome

  return (
    <Modal
      opened={aberta && Boolean(volta)}
      onClose={() => !enviando && aoFechar()}
      title={volta ? `Voltar o pedido #${pedido.numero} para ${destino}?` : ''}
      centered
      zIndex={400}
      size="lg"
      closeButtonProps={{ 'aria-label': 'Fechar sem mudar o pedido', size: 'xl' }}
      classNames={{ title: classes.detalhesTitulo }}
    >
      {volta && (
        <div className={classes.formMotivo}>
          <p className={classes.explicacaoMotivo}>Use só se o pedido mudou de coluna por engano. Ele volta para {destino}.</p>
          {avisoDeProntoEnviado(pedido) && (
            <p className={classes.lembrete}>
              <IconBrandWhatsapp size={22} aria-hidden />
              {pedido.cliente.nome.split(' ')[0]} já recebeu o aviso de que o pedido estava pronto. Depois de voltar, avise pelo WhatsApp que ainda falta um pouco.
            </p>
          )}
          {erro && (
            <Alert color="#b42318" variant="outline" icon={<IconAlertCircle size={22} aria-hidden />} className={classes.erroAcao} role="alert">
              {erro}
            </Alert>
          )}
          <div className={classes.botoesMotivo}>
            <Button onClick={aoConfirmar} loading={enviando} loaderProps={{ type: 'dots' }} leftSection={<IconArrowBackUp size={22} aria-hidden />}>
              {volta.rotulo}
            </Button>
            {/* O foco começa em "Manter como está": um Enter sem querer não muda o pedido */}
            <Button data-autofocus variant="outline" onClick={aoFechar} disabled={enviando}>
              Manter como está
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
