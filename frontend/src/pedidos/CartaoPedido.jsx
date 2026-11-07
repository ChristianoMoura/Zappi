import { IconCalendarEvent } from '@tabler/icons-react'
import { dataRetiradaCurta, moeda, resumoItens, retiraHoje, STATUS, totalPedido } from './regrasPedidos'
import classes from './QuadroPedidos.module.css'

// Card do quadro (RN09): número, cliente, retirada, itens e valor.
// PENDENTE: abrir os detalhes ao clicar é a ZAP-47; até lá o card só mostra as informações.
export function CartaoPedido({ pedido }) {
  const recusado = pedido.status === STATUS.RECUSADO

  return (
    <article className={classes.cartao} data-recusado={recusado || undefined} aria-label={`Pedido ${pedido.numero}`}>
      <span className={classes.numero}>#{pedido.numero}</span>
      <span className={classes.cliente}>{pedido.cliente.nome}</span>
      <span className={classes.retirada}>
        <IconCalendarEvent size={20} aria-hidden />
        Retirada: {dataRetiradaCurta(pedido.dataRetirada)}
      </span>
      <span className={classes.resumo}>{resumoItens(pedido)}</span>
      <span className={classes.rodape}>
        {retiraHoje(pedido) && <span className={`${classes.selo} ${classes.seloHoje}`}>Retira hoje</span>}
        {recusado && <span className={`${classes.selo} ${classes.seloRecusado}`}>Recusado</span>}
        <span className={classes.valor}>{moeda(totalPedido(pedido))}</span>
      </span>
    </article>
  )
}
