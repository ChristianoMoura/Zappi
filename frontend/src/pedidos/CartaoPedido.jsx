import { UnstyledButton } from '@mantine/core'
import { IconCalendarEvent, IconCircleCheck } from '@tabler/icons-react'
import { dataHoraTexto, dataRetiradaCurta, moeda, resumoItens, retiraHoje, STATUS, totalPedido } from './regrasPedidos'
import classes from './QuadroPedidos.module.css'

// Card do quadro (RN09): número, cliente, retirada, itens e valor. Abre os detalhes ao clicar.
// Na coluna Entregue, a linha da retirada dá lugar à data e à hora da entrega (ZAP-169).
export function CartaoPedido({ pedido, aoAbrir }) {
  const recusado = pedido.status === STATUS.RECUSADO
  const entregue = pedido.status === STATUS.ENTREGUE && pedido.entregueEm
  const hoje = retiraHoje(pedido)
  const retirada = dataRetiradaCurta(pedido.dataRetirada)
  const quando = entregue ? `entregue em ${dataHoraTexto(pedido.entregueEm)}` : `retirada ${retirada}`
  const total = moeda(totalPedido(pedido))

  return (
    <UnstyledButton
      className={classes.cartao}
      data-recusado={recusado || undefined}
      data-numero-pedido={pedido.numero}
      onClick={(evento) => aoAbrir(pedido, evento.currentTarget)}
      aria-label={`Pedido ${pedido.numero}, ${pedido.cliente.nome}, ${quando}, ${total}`}
    >
      <span className={classes.numero}>#{pedido.numero}</span>
      <span className={classes.cliente}>{pedido.cliente.nome}</span>
      {entregue ? (
        <span className={`${classes.retirada} ${classes.entregueEm}`}>
          <IconCircleCheck size={20} aria-hidden />
          Entregue em {dataHoraTexto(pedido.entregueEm)}
        </span>
      ) : (
        <span className={classes.retirada}>
          <IconCalendarEvent size={20} aria-hidden />
          Retirada: {retirada}
        </span>
      )}
      <span className={classes.resumo}>{resumoItens(pedido)}</span>
      <span className={classes.rodape}>
        {hoje && <span className={`${classes.selo} ${classes.seloHoje}`}>Retira hoje</span>}
        {recusado && <span className={`${classes.selo} ${classes.seloRecusado}`}>Recusado</span>}
        <span className={classes.valor}>{total}</span>
      </span>
    </UnstyledButton>
  )
}
