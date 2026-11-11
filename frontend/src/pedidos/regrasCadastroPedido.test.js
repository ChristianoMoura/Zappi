import { describe, expect, test } from 'vitest'
import { formularioDoPedido, lerQuantidade, montarPedido, ordemDosCampos, totalDoFormulario, validarPedido } from './regrasCadastroPedido'

// Domingo, 08/11/2026, às 10h15
const hoje = new Date(2026, 10, 8, 10, 15)
const produtos = [
  { id: 1, nome: 'Bolo', sabor: 'Brigadeiro de chocolate', unidade: 'KG', preco: 100 },
  { id: 4, nome: 'Salgado', sabor: 'Coxinha de frango', unidade: 'UN', preco: 1.2 },
]
const item = (extras) => ({ chave: 1, produtoId: '1', quantidade: '1,5', recheio: '', cobertura: '', observacao: '', ...extras })
const dados = (extras) => ({
  clienteNome: 'Ana Souza',
  clienteWhatsapp: '11987650012',
  consentimentoLgpd: true,
  itens: [item()],
  dataRetirada: '2026-11-14',
  horaRetirada: '15:00',
  observacao: '',
  ...extras,
})

describe('regras do cadastro de pedido (ZAP-89, RF13)', () => {
  test('lê a quantidade com vírgula ou ponto', () => {
    expect(lerQuantidade('1,5')).toBe(1.5)
    expect(lerQuantidade('2')).toBe(2)
    expect(lerQuantidade('')).toBeNull()
    expect(lerQuantidade('dois')).toBeNaN()
  })

  test('um pedido completo não tem erros', () => {
    expect(validarPedido(dados(), produtos, hoje)).toEqual({})
  })

  test('cliente, WhatsApp, consentimento, produto, quantidade e data são obrigatórios', () => {
    const erros = validarPedido(dados({ clienteNome: ' ', clienteWhatsapp: '', consentimentoLgpd: false, itens: [item({ produtoId: '' })], dataRetirada: '', horaRetirada: '' }), produtos, hoje)
    expect(Object.keys(erros).sort()).toEqual(['clienteNome', 'clienteWhatsapp', 'consentimentoLgpd', 'dataRetirada', 'horaRetirada', 'item-1-produto'].sort())
    expect(validarPedido(dados({ itens: [item({ quantidade: '' })] }), produtos, hoje)['item-1-quantidade']).toBe('Escreva a quantidade em kg. Ex.: 1,5')
  })

  test('KG aceita fração e UN só inteiro (RN12)', () => {
    expect(validarPedido(dados({ itens: [item({ produtoId: '4', quantidade: '50,5' })] }), produtos, hoje)['item-1-quantidade']).toMatch(/número inteiro/)
    expect(validarPedido(dados({ itens: [item({ produtoId: '4', quantidade: '50' })] }), produtos, hoje)).toEqual({})
    expect(validarPedido(dados({ itens: [item({ quantidade: '0' })] }), produtos, hoje)['item-1-quantidade']).toMatch(/maior que zero/)
  })

  test('não aceita data de retirada que já passou, mas aceita hoje', () => {
    expect(validarPedido(dados({ dataRetirada: '2026-11-07' }), produtos, hoje).dataRetirada).toMatch(/já passou/)
    expect(validarPedido(dados({ dataRetirada: '2026-11-08', horaRetirada: '10:30' }), produtos, hoje)).toEqual({})
  })

  test('só aceita horário das 8h às 20h, de 30 em 30 minutos, e não um horário de hoje que já passou (RN23)', () => {
    for (const hora of ['07:30', '20:30', '15:15']) {
      expect(validarPedido(dados({ horaRetirada: hora }), produtos, hoje).horaRetirada).toMatch(/entre 8h e 20h/)
    }
    expect(validarPedido(dados({ horaRetirada: '08:00' }), produtos, hoje)).toEqual({})
    expect(validarPedido(dados({ horaRetirada: '20:00' }), produtos, hoje)).toEqual({})
    expect(validarPedido(dados({ dataRetirada: '2026-11-08', horaRetirada: '10:00' }), produtos, hoje).horaRetirada).toMatch(/já passou/)
  })

  test('na edição, a data e hora que já estava no pedido pode ficar, mesmo que tenha passado', () => {
    const passada = dados({ dataRetirada: '2026-11-01', horaRetirada: '09:00' })
    expect(validarPedido(passada, produtos, hoje, '2026-11-01T09:00')).toEqual({})
    expect(validarPedido(passada, produtos, hoje, '2026-11-01T10:00').dataRetirada).toMatch(/já passou/)
  })

  test('monta a retirada com a data e o horário e separa os dois ao editar', () => {
    expect(montarPedido(dados(), produtos).dataRetirada).toBe('2026-11-14T15:00')
    const formulario = formularioDoPedido({ cliente: { nome: 'Ana', telefone: '5511987650012' }, dataRetirada: '2026-11-14T08:30', itens: [] })
    expect(formulario).toMatchObject({ dataRetirada: '2026-11-14', horaRetirada: '08:30' })
  })

  test('confere o WhatsApp com DDD', () => {
    expect(validarPedido(dados({ clienteWhatsapp: '1198765' }), produtos, hoje).clienteWhatsapp).toMatch(/DDD e 9 números/)
  })

  test('soma o total e monta o pedido com o preço do cardápio congelado (RN10, RN11)', () => {
    const itens = [item(), item({ chave: 2, produtoId: '4', quantidade: '50', observacao: ' massa branca ' })]
    expect(totalDoFormulario(itens, produtos)).toBe(210)
    const pedido = montarPedido(dados({ itens, clienteNome: ' Ana Souza ' }), produtos)
    expect(pedido.cliente).toEqual({ nome: 'Ana Souza', telefone: '5511987650012' })
    expect(pedido.itens[0]).toEqual({ produtoId: 1, produto: 'Bolo', sabor: 'Brigadeiro de chocolate', unidade: 'KG', quantidade: 1.5, precoUnitario: 100 })
    expect(pedido.itens[1].observacao).toBe('massa branca')
  })

  test('a ordem dos campos segue cliente, itens, retirada e observações (NBR 17225 5.1.4)', () => {
    expect(ordemDosCampos([item(), item({ chave: 2 })])).toEqual([
      'clienteNome', 'clienteWhatsapp', 'consentimentoLgpd',
      'item-1-produto', 'item-1-quantidade', 'item-2-produto', 'item-2-quantidade',
      'dataRetirada', 'horaRetirada', 'observacao',
    ])
  })
})
