import { Alert, Button, Modal } from '@mantine/core'
import { IconAlertCircle, IconEyeOff } from '@tabler/icons-react'
import classes from './Produtos.module.css'

// Confirmação antes de tirar o produto do cardápio (ZAP-155), usada na lista e na tela do
// produto. O foco começa em "Manter no cardápio", a opção segura, como na JanelaVoltar.
export function JanelaTirarDoCardapio({ produto, aoFechar, aoConfirmar, enviando, erro, aoTerminarDeFechar }) {
  return (
    <Modal
      opened={produto !== null}
      onClose={() => !enviando && aoFechar()}
      title={produto ? `Tirar ${produto.nome} do cardápio?` : ''}
      centered
      size="lg"
      returnFocus={false}
      onExitTransitionEnd={aoTerminarDeFechar}
      closeButtonProps={{ 'aria-label': 'Fechar sem tirar do cardápio', size: 'xl' }}
      classNames={{ title: classes.tituloJanela }}
    >
      <div className={classes.janela}>
        <p>O produto some do cardápio, mas continua aqui. Você pode voltar com ele quando quiser.</p>
        {erro && (
          <Alert color="#b42318" variant="outline" icon={<IconAlertCircle size={22} aria-hidden />} className={classes.erroJanela} role="alert">
            {erro}
          </Alert>
        )}
        <div className={classes.botoesJanela}>
          <Button data-autofocus variant="outline" size="lg" onClick={aoFechar} disabled={enviando}>
            Manter no cardápio
          </Button>
          <Button size="lg" onClick={aoConfirmar} loading={enviando} loaderProps={{ type: 'dots' }} leftSection={<IconEyeOff size={22} aria-hidden />}>
            Tirar do cardápio
          </Button>
        </div>
      </div>
    </Modal>
  )
}
