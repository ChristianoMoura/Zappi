import { Alert, Button, Drawer } from '@mantine/core'
import { IconAlertCircle, IconCheck, IconSend, IconX } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { JanelaMotivo } from './JanelaMotivo'
import { COLUNAS, dataRetiradaCurta, mensagensDaEtapa, moeda, podeCancelar, podeRecusar, quantidadeTexto, retiraHoje, STATUS, subtotal, totalPedido } from './regrasPedidos'
import classes from './QuadroPedidos.module.css'

const telefoneTela = (telefone) => `(${telefone.slice(2, 4)}) ${telefone.slice(4, 9)}-${telefone.slice(9)}`

function dataHora(iso) {
  const [data, hora] = iso.split('T')
  const [, mes, dia] = data.split('-')
  return `${dia}/${mes} às ${hora}`
}

const EtiquetaMensagem = ({ mensagem }) =>
  mensagem.status === 'Enviada' ? (
    <span className={`${classes.selo} ${classes.seloEnviada}`}>Enviada</span>
  ) : (
    <span className={`${classes.selo} ${classes.seloPendente}`}>Ainda não enviada</span>
  )

// Mensagem da etapa atual com o botão "Enviar no WhatsApp" (ZAP-51) e as anteriores recolhidas,
// só para consulta. O botão abre o link wa.me e marca a mensagem como enviada; continua
// disponível para reenviar (ZAP-64).
function MensagensDoPedido({ pedido, aoEnviarMensagem, botaoEnviarRef }) {
  const { atual, anteriores } = mensagensDaEtapa(pedido)
  if (!atual && anteriores.length === 0) return null
  const primeiroNome = pedido.cliente.nome.split(' ')[0]

  return (
    <section className={classes.bloco} aria-labelledby="detalhes-mensagem">
      <h3 id="detalhes-mensagem">Mensagem para o cliente</h3>
      <div className={classes.mensagens}>
        {atual ? (
          <div className={classes.mensagemAtual}>
            <div className={classes.mensagemTopo}>
              <span>{atual.mensagem.tipo}</span>
              <EtiquetaMensagem mensagem={atual.mensagem} />
            </div>
            <p className={classes.mensagemTexto}>{atual.mensagem.texto}</p>
            <div className={classes.mensagemAcoes}>
              <Button
                ref={botaoEnviarRef}
                component="a"
                href={atual.mensagem.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => aoEnviarMensagem(atual.indice)}
                color="#1f7a4d"
                fullWidth
                leftSection={<IconSend size={22} aria-hidden />}
                aria-label={`${atual.mensagem.status === 'Enviada' ? 'Enviar de novo' : 'Enviar'} no WhatsApp para ${primeiroNome} (abre o WhatsApp)`}
              >
                {atual.mensagem.status === 'Enviada' ? 'Enviar de novo no WhatsApp' : 'Enviar no WhatsApp'}
              </Button>
              {atual.mensagem.enviadoEm && (
                <span className={classes.apoio}>Enviada em {dataHora(atual.mensagem.enviadoEm)}. Se fechou o WhatsApp sem mandar, envie de novo.</span>
              )}
            </div>
          </div>
        ) : (
          <p className={classes.semMensagem}>
            {pedido.status === STATUS.EM_PRODUCAO
              ? 'Nesta etapa não há mensagem para enviar. O cliente recebe o aviso quando o pedido ficar pronto.'
              : 'Nesta etapa não há mensagem para enviar.'}
          </p>
        )}

        {anteriores.length > 0 && (
          <details className={classes.anteriores}>
            <summary>Mensagens anteriores ({anteriores.length})</summary>
            <ul className={classes.itens}>
              {anteriores.map(({ mensagem, indice }) => (
                <li key={indice} className={classes.mensagemAnterior}>
                  <div className={classes.mensagemTopo}>
                    <span>{mensagem.tipo}</span>
                    <EtiquetaMensagem mensagem={mensagem} />
                  </div>
                  <p className={classes.mensagemTexto}>{mensagem.texto}</p>
                  {mensagem.enviadoEm && <span className={classes.apoio}>Enviada em {dataHora(mensagem.enviadoEm)}.</span>}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </section>
  )
}

// Detalhes do pedido (ZAP-47, RF08). No computador abre pela direita; no celular, sobe de baixo.
// A faixa de baixo mostra só os próximos passos possíveis (ZAP-64): "Confirmar pedido" e
// "Recusar pedido" nos Novos (ZAP-51, ZAP-54) e "Cancelar pedido" nos Confirmados e Em produção
// (ZAP-54). O andamento entre as colunas entra na ZAP-77.
const SUCESSO = {
  confirmar: 'Pedido confirmado e movido para a coluna Confirmado.',
  recusar: 'Pedido recusado e movido para a coluna Recusado.',
  cancelar: 'Pedido cancelado e movido para a coluna Recusado.',
}

export function DetalhesPedido({ pedido, aberto, aoFechar, telaGrande, aoConfirmar, aoRecusar, aoEnviarMensagem, enviando, acabouDe, erroAcao }) {
  const coluna = pedido && COLUNAS.find((c) => c.status === pedido.status)
  const botaoEnviarRef = useRef(null)
  const [janela, setJanela] = useState(null)

  // Depois de confirmar, recusar ou cancelar, o botão some; o foco vai para o próximo passo,
  // que é enviar a mensagem
  useEffect(() => {
    if (acabouDe) botaoEnviarRef.current?.focus()
  }, [acabouDe])

  async function concluirMotivo(motivo) {
    if (await aoRecusar(pedido, motivo)) setJanela(null)
  }

  const primeiroNome = pedido?.cliente.nome.split(' ')[0]
  const historico = pedido
    ? [
        ['Recebido', pedido.criadoEm],
        ['Confirmado', pedido.confirmadoEm],
        [pedido.cancelado ? 'Cancelado' : 'Recusado', pedido.recusadoEm],
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

          {acabouDe && (
            <Alert color="#1d6b45" variant="outline" icon={<IconCheck size={22} aria-hidden />} className={classes.sucesso} role="status">
              {SUCESSO[acabouDe]} Agora envie a mensagem para {primeiroNome}.
            </Alert>
          )}

          {erroAcao && !janela && (
            <Alert color="#b42318" variant="outline" icon={<IconAlertCircle size={22} aria-hidden />} className={classes.erroAcao} role="alert">
              {erroAcao}
            </Alert>
          )}

          <MensagensDoPedido pedido={pedido} aoEnviarMensagem={aoEnviarMensagem} botaoEnviarRef={botaoEnviarRef} />

          {pedido.motivoRecusa && (
            <p className={classes.motivo}>
              <strong>{pedido.cancelado ? 'Motivo do cancelamento:' : 'Motivo da recusa:'}</strong> {pedido.motivoRecusa}
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

          {podeRecusar(pedido.status) && (
            <div className={classes.faixaAcoes}>
              <Button fullWidth onClick={() => aoConfirmar(pedido)} loading={enviando && !janela} loaderProps={{ type: 'dots' }} leftSection={<IconCheck size={22} aria-hidden />}>
                Confirmar pedido
              </Button>
              <Button fullWidth variant="outline" color="#b42318" onClick={() => setJanela('recusar')} disabled={enviando} leftSection={<IconX size={22} aria-hidden />}>
                Recusar pedido
              </Button>
              <p className={classes.dicaAcao}>Nos dois casos, o Zappi prepara a mensagem para {primeiroNome}.</p>
            </div>
          )}

          {podeCancelar(pedido.status) && (
            <div className={classes.faixaAcoes}>
              <Button fullWidth variant="outline" color="#b42318" onClick={() => setJanela('cancelar')} leftSection={<IconX size={22} aria-hidden />}>
                Cancelar pedido
              </Button>
              <p className={classes.dicaAcao}>Use só se não for possível entregar. O Zappi prepara uma mensagem avisando {primeiroNome}.</p>
            </div>
          )}

          <JanelaMotivo
            pedido={pedido}
            acao={janela}
            aberta={janela !== null}
            aoFechar={() => setJanela(null)}
            aoConcluir={concluirMotivo}
            enviando={enviando}
            erro={janela ? erroAcao : ''}
          />
        </div>
      )}
    </Drawer>
  )
}
