// Leitura dos pedidos do estabelecimento da usuária logada.
// PENDENTE: a API é a ZAP-44, que ainda não existe. Enquanto isso, no modo de
// desenvolvimento os pedidos são simulados com clientes fictícios (nenhum dado real);
// fora dele, a tela avisa que o serviço não está disponível.
// Quando a ZAP-44 ficar pronta, só este arquivo muda.

import { dataLocal, STATUS } from './regrasPedidos'

export class ServicoIndisponivelError extends Error {}

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms))

// Datas relativas a hoje, para o quadro sempre ter pedidos de hoje e dos próximos dias
function dia(deslocamento, hora) {
  const data = new Date()
  data.setDate(data.getDate() + deslocamento)
  return hora ? `${dataLocal(data)}T${hora}` : dataLocal(data)
}

// Campos com os nomes da tela; a ZAP-44 converte das colunas de `pedido`, `item_pedido`,
// `cliente` e `mensagem_whatsapp`. Preços do cardápio da Casa Belt (seção 2.2 do context.md).
const bolo = (sabor, quantidade, precoUnitario, extras = {}) => ({ produto: 'Bolo', sabor, unidade: 'KG', quantidade, precoUnitario, ...extras })
const salgado = (sabor, quantidade, precoUnitario) => ({ produto: 'Salgado', sabor, unidade: 'UN', quantidade, precoUnitario })

function pedidosSimulados() {
  return [
    {
      numero: 13, status: STATUS.NOVO, dataRetirada: dia(8), criadoEm: dia(-1, '19:12'),
      cliente: { nome: 'Marcos Lima', telefone: '5511987650013' }, observacao: 'Aniversário de 40 anos',
      itens: [bolo('Ninho com morango', 1.5, 115, { recheio: 'Ninho com morango', cobertura: 'Chantilly' })],
      mensagens: [],
    },
    {
      numero: 12, status: STATUS.NOVO, dataRetirada: dia(7), criadoEm: dia(-1, '10:40'),
      cliente: { nome: 'Ana Souza', telefone: '5511987650012' }, observacao: 'Festa infantil, tema fundo do mar',
      itens: [bolo('Brigadeiro de chocolate', 2, 100, { recheio: 'Brigadeiro', cobertura: 'Granulado' })],
      mensagens: [],
    },
    {
      numero: 11, status: STATUS.CONFIRMADO, dataRetirada: dia(7), criadoEm: dia(-2, '16:03'), confirmadoEm: dia(-2, '18:20'),
      cliente: { nome: 'João Pereira', telefone: '5511987650011' },
      itens: [bolo('Brigadeiro de chocolate', 3, 100, { recheio: 'Brigadeiro com morango', cobertura: 'Ganache' })],
      mensagens: [{ tipo: 'Confirmação', status: 'Pendente' }],
    },
    {
      numero: 10, status: STATUS.CONFIRMADO, dataRetirada: dia(6), criadoEm: dia(-3, '09:15'), confirmadoEm: dia(-3, '12:00'),
      cliente: { nome: 'Carla Dias', telefone: '5511987650010' }, observacao: 'Para o escritório',
      itens: [salgado('Coxinha de frango', 100, 1.2)],
      mensagens: [{ tipo: 'Confirmação', status: 'Enviada' }],
    },
    {
      numero: 9, status: STATUS.EM_PRODUCAO, dataRetirada: dia(0), criadoEm: dia(-5, '14:30'), confirmadoEm: dia(-5, '17:45'),
      cliente: { nome: 'Beatriz Rocha', telefone: '5511987650009' },
      itens: [bolo('Ninho com morango', 2, 115, { recheio: 'Ninho com morango', cobertura: 'Chantilly', observacao: 'Escrever "Parabéns, Lia"' })],
      mensagens: [{ tipo: 'Confirmação', status: 'Enviada' }],
    },
    {
      numero: 8, status: STATUS.CONCLUIDO, dataRetirada: dia(0), criadoEm: dia(-6, '11:00'), confirmadoEm: dia(-6, '13:10'), concluidoEm: dia(0, '08:30'),
      cliente: { nome: 'Pedro Alves', telefone: '5511987650008' },
      itens: [bolo('Brigadeiro de chocolate', 1, 100, { recheio: 'Brigadeiro', cobertura: 'Granulado' })],
      mensagens: [{ tipo: 'Confirmação', status: 'Enviada' }, { tipo: 'Pronto para retirada', status: 'Pendente' }],
    },
    {
      numero: 7, status: STATUS.RECUSADO, dataRetirada: dia(1), criadoEm: dia(-4, '20:05'), recusadoEm: dia(-3, '08:10'),
      cliente: { nome: 'Rita Gomes', telefone: '5511987650007' }, motivoRecusa: 'Agenda cheia nesse dia. Posso fazer para o dia seguinte.',
      itens: [bolo('Ninho com morango', 4, 115, { recheio: 'Ninho com morango', cobertura: 'Chantilly' })],
      mensagens: [{ tipo: 'Recusa', status: 'Enviada' }],
    },
    {
      numero: 6, status: STATUS.RECUSADO, dataRetirada: dia(-2), criadoEm: dia(-3, '22:40'), recusadoEm: dia(-2, '07:30'),
      cliente: { nome: 'Lucas Moreira', telefone: '5511987650006' }, motivoRecusa: 'Pedido feito com menos de 2 dias de antecedência.',
      itens: [salgado('Coxinha de frango', 200, 1.2)],
      mensagens: [{ tipo: 'Recusa', status: 'Enviada' }],
    },
  ]
}

export async function buscarPedidos() {
  if (!import.meta.env.DEV) throw new ServicoIndisponivelError()
  await esperar(400)
  return pedidosSimulados()
}
