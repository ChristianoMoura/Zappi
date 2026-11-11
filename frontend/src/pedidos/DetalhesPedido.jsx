import { Alert, Button, Drawer } from '@mantine/core'
import { IconAlertCircle, IconArrowBackUp, IconCheck, IconCircleCheck, IconPencil, IconSend, IconToolsKitchen2, IconUserX, IconX } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { JanelaAnonimizar } from './JanelaAnonimizar'
import { JanelaMotivo } from './JanelaMotivo'
import { JanelaVoltar } from './JanelaVoltar'
import { AVANCO, avisoDeProntoEnviado, COLUNAS, dataRetiradaCurta, mensagensDaEtapa, moeda, podeAnonimizar, podeCancelar, podeEditar, podeRecusar, quantidadeTexto, retiraHoje, STATUS, subtotal, totalPedido, VOLTA } from './regrasPedidos'
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
function MensagensDoPedido({ pedido, aoEnviarMensagem, botaoEnviarRef, focoInicial }) {
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
              {pedido.cliente.anonimizado ? (
                <span className={classes.apoio}>Os dados deste cliente foram apagados. Não há WhatsApp para enviar.</span>
              ) : (
                <>
                  <Button
                    ref={botaoEnviarRef}
                    data-autofocus={focoInicial || undefined}
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
                </>
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
// A faixa de baixo mostra só os próximos passos possíveis (ZAP-64):
// - Novo: "Confirmar pedido" e "Recusar pedido" (ZAP-51, ZAP-54);
// - Confirmado: "Iniciar produção" e "Cancelar pedido" (ZAP-77, ZAP-54);
// - Em produção: "Marcar como pronto", "Cancelar pedido" e "Voltar para confirmado";
// - Concluído: "Voltar para produção". Recusado não tem ações.
const SUCESSO = {
  confirmar: { texto: 'Pedido confirmado e movido para a coluna Confirmado.', enviar: true },
  recusar: { texto: 'Pedido recusado e movido para a coluna Recusado.', enviar: true },
  cancelar: { texto: 'Pedido cancelado e movido para a coluna Recusado.', enviar: true },
  iniciar: { texto: 'Pedido movido para a coluna Em produção. Quando ficar pronto, marque como pronto.' },
  pronto: { texto: 'Pedido pronto e movido para a coluna Concluído.', enviar: true },
  voltar: { texto: 'Pedido voltou para a coluna' },
  editar: { texto: 'Pedido atualizado.', enviar: true },
  anonimizar: { texto: 'Dados do cliente apagados. Os pedidos continuam no histórico.' },
}

function textoSucesso(acabouDe, coluna, primeiroNome) {
  const { texto, enviar } = SUCESSO[acabouDe]
  if (acabouDe === 'editar') {
    if (coluna.status === STATUS.CONFIRMADO) return `${texto} Envie a confirmação atualizada para ${primeiroNome}.`
    return coluna.status === STATUS.EM_PRODUCAO ? `${texto} Lembre de avisar ${primeiroNome} pelo WhatsApp sobre o que mudou.` : texto
  }
  if (acabouDe === 'voltar') return `${texto} ${coluna.nome}.`
  return enviar ? `${texto} Agora envie a mensagem para ${primeiroNome}.` : texto
}

export function DetalhesPedido({ pedido, aberto, aoFechar, telaGrande, aoConfirmar, aoRecusar, aoAvancar, aoVoltar, aoAnonimizar, aoEnviarMensagem, enviando, acabouDe, erroAcao }) {
  const coluna = pedido && COLUNAS.find((c) => c.status === pedido.status)
  const botaoEnviarRef = useRef(null)
  const sucessoRef = useRef(null)
  const [janela, setJanela] = useState(null)

  // Depois de uma ação, o botão dela some. Se há mensagem a enviar, o foco vai para "Enviar no
  // WhatsApp"; se não, para o aviso de sucesso, que diz onde o pedido foi parar.
  useEffect(() => {
    if (!acabouDe) return
    if (SUCESSO[acabouDe].enviar && botaoEnviarRef.current) botaoEnviarRef.current.focus()
    else sucessoRef.current?.focus()
    // O número entra aqui porque, ao voltar da edição, o painel abre já com o aviso
  }, [acabouDe, pedido?.numero])

  async function concluirMotivo(motivo) {
    if (await aoRecusar(pedido, motivo)) setJanela(null)
  }

  async function concluirVolta() {
    if (await aoVoltar(pedido)) setJanela(null)
  }

  async function concluirAnonimizacao() {
    if (await aoAnonimizar(pedido)) setJanela(null)
  }

  const anonimizado = pedido?.cliente.anonimizado
  const avanco = pedido && AVANCO[pedido.status]
  // Cliente anonimizado não volta para produção: não haveria para quem avisar (RN17)
  const volta = pedido && !anonimizado && VOLTA[pedido.status]
  const bloqueadoAnonimizar = pedido && !podeAnonimizar(pedido.status)

  const primeiroNome = pedido?.cliente.nome.split(' ')[0]
  const historico = pedido
    ? [
        ['Recebido', pedido.criadoEm],
        ['Confirmado', pedido.confirmadoEm],
        ['Em produção', pedido.producaoEm],
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
            {podeEditar(pedido.status) && (
              <Button component={Link} to={`/pedidos/${pedido.numero}/editar`} variant="subtle" size="md" leftSection={<IconPencil size={20} aria-hidden />} className={classes.editarPedido}>
                Editar pedido
              </Button>
            )}
          </div>

          {acabouDe && (
            <Alert ref={sucessoRef} tabIndex={-1} data-autofocus={(acabouDe === 'editar' && pedido.status !== STATUS.CONFIRMADO) || undefined} color="#1d6b45" variant="outline" icon={<IconCheck size={22} aria-hidden />} className={classes.sucesso} role="status">
              {textoSucesso(acabouDe, coluna, primeiroNome)}
              {acabouDe === 'voltar' && pedido.status === STATUS.EM_PRODUCAO && avisoDeProntoEnviado(pedido) && (
                <> Lembre de avisar {primeiroNome} pelo WhatsApp que o pedido ainda não está pronto.</>
              )}
            </Alert>
          )}

          {erroAcao && !janela && (
            <Alert color="#b42318" variant="outline" icon={<IconAlertCircle size={22} aria-hidden />} className={classes.erroAcao} role="alert">
              {erroAcao}
            </Alert>
          )}

          <MensagensDoPedido pedido={pedido} aoEnviarMensagem={aoEnviarMensagem} botaoEnviarRef={botaoEnviarRef} focoInicial={acabouDe === 'editar'} />

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
              {!anonimizado && (
                <>
                  <dt>WhatsApp</dt>
                  <dd>{telefoneTela(pedido.cliente.telefone)}</dd>
                </>
              )}
            </dl>
            {!anonimizado && (
              <div className={classes.apagarDados}>
                <Button
                  fullWidth
                  variant="outline"
                  color="#b42318"
                  onClick={() => setJanela('anonimizar')}
                  disabled={bloqueadoAnonimizar || enviando}
                  aria-describedby={bloqueadoAnonimizar ? 'motivo-bloqueio-dados' : undefined}
                  leftSection={<IconUserX size={22} aria-hidden />}
                >
                  Apagar dados do cliente
                </Button>
                {bloqueadoAnonimizar && (
                  <p id="motivo-bloqueio-dados" className={classes.motivoBloqueio}>
                    Só dá para apagar os dados quando o pedido estiver concluído ou recusado. Até lá, o nome e o WhatsApp são necessários para atender o pedido.
                  </p>
                )}
              </div>
            )}
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
                  {(item.recheio || item.cobertura) && (
                    <span className={classes.apoio}>
                      {[item.recheio && `Recheio: ${item.recheio}`, item.cobertura && `Cobertura: ${item.cobertura}`].filter(Boolean).join(' · ')}
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
            </div>
          )}

          {(avanco || volta) && (
            <div className={classes.faixaAcoes}>
              {avanco && (
                <Button
                  fullWidth
                  onClick={() => aoAvancar(pedido)}
                  loading={enviando && !janela}
                  loaderProps={{ type: 'dots' }}
                  leftSection={avanco.destino === STATUS.CONCLUIDO ? <IconCircleCheck size={22} aria-hidden /> : <IconToolsKitchen2 size={22} aria-hidden />}
                >
                  {avanco.rotulo}
                </Button>
              )}
              {podeCancelar(pedido.status) && (
                <Button fullWidth variant="outline" color="#b42318" onClick={() => setJanela('cancelar')} disabled={enviando} leftSection={<IconX size={22} aria-hidden />}>
                  Cancelar pedido
                </Button>
              )}
              {volta && (
                <Button fullWidth variant="subtle" onClick={() => setJanela('voltar')} disabled={enviando} leftSection={<IconArrowBackUp size={22} aria-hidden />}>
                  {volta.rotulo}
                </Button>
              )}
            </div>
          )}

          <JanelaVoltar pedido={pedido} aberta={janela === 'voltar'} aoFechar={() => setJanela(null)} aoConfirmar={concluirVolta} enviando={enviando} erro={janela === 'voltar' ? erroAcao : ''} />

          <JanelaAnonimizar pedido={pedido} aberta={janela === 'anonimizar'} aoFechar={() => setJanela(null)} aoConfirmar={concluirAnonimizacao} enviando={enviando} erro={janela === 'anonimizar' ? erroAcao : ''} />

          <JanelaMotivo
            pedido={pedido}
            acao={janela}
            aberta={janela === 'recusar' || janela === 'cancelar'}
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
