import { UnstyledButton } from '@mantine/core'
import { IconCalendarEvent } from '@tabler/icons-react'
import { dataRetiradaCurta, moeda, resumoItens, retiraHoje, STATUS, totalPedido } from './regrasPedidos'
import classes from './QuadroPedidos.module.css'

// Card do quadro (RN09): número, cliente, retirada, itens e valor. Abre os detalhes ao clicar.
export function CartaoPedido({ pedido, aoAbrir }) {
  const recusado = pedido.status === STATUS.RECUSADO
  const hoje = retiraHoje(pedido)
  const retirada = dataRetiradaCurta(pedido.dataRetirada)
  const total = moeda(totalPedido(pedido))

  return (
    <UnstyledButton
      className={classes.cartao}
      data-recusado={recusado || undefined}
      onClick={(evento) => aoAbrir(pedido, evento.currentTarget)}
      aria-label={`Pedido ${pedido.numero}, ${pedido.cliente.nome}, retirada ${retirada}, ${total}`}
    >
      <span className={classes.numero}>#{pedido.numero}</span>
      <span className={classes.cliente}>{pedido.cliente.nome}</span>
      <span className={classes.retirada}>
        <IconCalendarEvent size={20} aria-hidden />
        Retirada: {retirada}
      </span>
      <span className={classes.resumo}>{resumoItens(pedido)}</span>
      <span className={classes.rodape}>
        {hoje && <span className={`${classes.selo} ${classes.seloHoje}`}>Retira hoje</span>}
        {recusado && <span className={`${classes.selo} ${classes.seloRecusado}`}>Recusado</span>}
        <span className={classes.valor}>{total}</span>
      </span>
    </UnstyledButton>
  )
}
