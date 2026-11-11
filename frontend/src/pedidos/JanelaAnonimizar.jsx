import { Alert, Button, Modal } from '@mantine/core'
import { IconAlertCircle, IconAlertTriangle, IconUserX } from '@tabler/icons-react'
import { useEffect, useRef } from 'react'
import classes from './QuadroPedidos.module.css'

// Confirmação antes de apagar os dados do cliente (ZAP-116, RN17, LGPD). O título não leva o nome
// porque, ao dar certo, o nome muda enquanto a janela ainda está fechando.
export function JanelaAnonimizar({ pedido, aberta, aoFechar, aoConfirmar, enviando, erro }) {
  const erroRef = useRef(null)

  // Os botões ficam desativados durante o envio e o foco se perde; sem isto, o Tab sairia da janela
  useEffect(() => {
    if (erro) erroRef.current?.focus()
  }, [erro])

  return (
    <Modal
      opened={aberta}
      onClose={() => !enviando && aoFechar()}
      title="Apagar os dados do cliente?"
      centered
      zIndex={400}
      size="lg"
      closeButtonProps={{ 'aria-label': 'Fechar sem apagar os dados', size: 'xl' }}
      classNames={{ title: classes.detalhesTitulo }}
    >
      {!pedido.cliente.anonimizado && (
        <div className={classes.formMotivo}>
          <p className={classes.explicacaoMotivo}>
            O nome e o WhatsApp de {pedido.cliente.nome} serão apagados de todos os pedidos. Os pedidos e os valores continuam no histórico, com o nome “Cliente anonimizado”.
          </p>
          <p className={`${classes.lembrete} ${classes.lembreteAlerta}`}>
            <IconAlertTriangle size={22} aria-hidden />
            Isso não pode ser desfeito. Use só se o cliente pediu para apagar os dados.
          </p>
          {erro && (
            <Alert ref={erroRef} tabIndex={-1} color="#b42318" variant="outline" icon={<IconAlertCircle size={22} aria-hidden />} className={classes.erroAcao} role="alert">
              {erro}
            </Alert>
          )}
          <div className={classes.botoesMotivo}>
            <Button color="#b42318" onClick={aoConfirmar} loading={enviando} loaderProps={{ type: 'dots' }} leftSection={<IconUserX size={22} aria-hidden />}>
              Apagar os dados
            </Button>
            {/* O foco começa em "Manter os dados": um Enter sem querer não apaga nada */}
            <Button data-autofocus variant="outline" onClick={aoFechar} disabled={enviando}>
              Manter os dados
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
