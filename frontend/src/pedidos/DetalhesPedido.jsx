import { Drawer } from '@mantine/core'
import { COLUNAS, dataRetiradaCurta, moeda, quantidadeTexto, retiraHoje, STATUS, subtotal, totalPedido } from './regrasPedidos'
import classes from './QuadroPedidos.module.css'

const telefoneTela = (telefone) => `(${telefone.slice(2, 4)}) ${telefone.slice(4, 9)}-${telefone.slice(9)}`

function dataHora(iso) {
  const [data, hora] = iso.split('T')
  const [, mes, dia] = data.split('-')
  return `${dia}/${mes} às ${hora}`
}

// Detalhes do pedido (ZAP-47, RF08). No computador abre pela direita; no celular, sobe de baixo.
// Os botões de confirmar, recusar e mudar o andamento entram aqui nas próximas histórias.
export function DetalhesPedido({ pedido, aberto, aoFechar, telaGrande }) {
  const coluna = pedido && COLUNAS.find((c) => c.status === pedido.status)
  const historico = pedido
    ? [
        ['Recebido', pedido.criadoEm],
        ['Confirmado', pedido.confirmadoEm],
        ['Recusado', pedido.recusadoEm],
        ['Concluído', pedido.concluidoEm],
      ].filter(([, data]) => data)
    : []

  return (
    <Drawer
      opened={aberto}
      onClose={aoFechar}
      position={telaGrande ? 'right' : 'bottom'}
      size={telaGrande ? 460 : '88%'}
      title={pedido ? `Pedido #${pedido.numero}` : ''}
      closeButtonProps={{ 'aria-label': 'Fechar detalhes', size: 'xl' }}
      classNames={{ title: classes.detalhesTitulo, content: classes.detalhesConteudo, header: classes.detalhesTopo, body: classes.detalhesCorpo }}
    >
      {pedido && (
        <div className={classes.detalhes}>
          <div className={classes.selos}>
            <span className={`${classes.selo} ${pedido.status === STATUS.RECUSADO ? classes.seloRecusado : classes.seloStatus}`}>{coluna.nome}</span>
            {retiraHoje(pedido) && <span className={`${classes.selo} ${classes.seloHoje}`}>Retira hoje</span>}
          </div>

          {pedido.motivoRecusa && (
            <p className={classes.motivo}>
              <strong>Motivo da recusa:</strong> {pedido.motivoRecusa}
            </p>
          )}

          <section className={classes.bloco} aria-labelledby="detalhes-retirada">
            <h3 id="detalhes-retirada">Retirada</h3>
            <dl>
              <dt>Data</dt>
              <dd>{dataRetiradaCurta(pedido.dataRetirada)}</dd>
              {pedido.observacao && (
                <>
                  <dt>Ocasião</dt>
                  <dd>{pedido.observacao}</dd>
                </>
              )}
              <dt>Pagamento</dt>
              <dd>Na retirada</dd>
            </dl>
          </section>

          <section className={classes.bloco} aria-labelledby="detalhes-cliente">
            <h3 id="detalhes-cliente">Cliente</h3>
            <dl>
              <dt>Nome</dt>
              <dd>{pedido.cliente.nome}</dd>
              <dt>WhatsApp</dt>
              <dd>{telefoneTela(pedido.cliente.telefone)}</dd>
            </dl>
          </section>

          <section className={classes.bloco} aria-labelledby="detalhes-itens">
            <h3 id="detalhes-itens">Itens</h3>
            <ul className={classes.itens}>
              {pedido.itens.map((item, i) => (
                <li key={i} className={classes.item}>
                  <span className={classes.itemLinha}>
                    <span>{item.produto} · {item.sabor}</span>
                    <span>{moeda(subtotal(item))}</span>
                  </span>
                  <span className={classes.apoio}>
                    {quantidadeTexto(item)} × {moeda(item.precoUnitario)}/{item.unidade === 'KG' ? 'kg' : 'un'}
                  </span>
                  {item.recheio && (
                    <span className={classes.apoio}>
                      Recheio: {item.recheio} · Cobertura: {item.cobertura}
                    </span>
                  )}
                  {item.observacao && <span className={classes.apoio}>Obs.: {item.observacao}</span>}
                </li>
              ))}
            </ul>
          </section>

          <p className={classes.total}>
            <span>Total</span>
            <span>{moeda(totalPedido(pedido))}</span>
          </p>

          <section className={classes.bloco} aria-labelledby="detalhes-historico">
            <h3 id="detalhes-historico">Histórico</h3>
            <dl>
              {historico.map(([rotulo, data]) => (
                <div key={rotulo} className={classes.par}>
                  <dt>{rotulo}</dt>
                  <dd>{dataHora(data)}</dd>
                </div>
              ))}
            </dl>
          </section>

          {pedido.mensagens.length > 0 && (
            <section className={classes.bloco} aria-labelledby="detalhes-mensagens">
              <h3 id="detalhes-mensagens">Mensagens de WhatsApp</h3>
              <ul className={classes.itens}>
                {pedido.mensagens.map((mensagem, i) => (
                  <li key={i} className={classes.mensagem}>
                    {mensagem.tipo} · {mensagem.status}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Drawer>
  )
}
