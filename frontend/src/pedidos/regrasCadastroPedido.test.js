import { describe, expect, test } from 'vitest'
import { lerQuantidade, montarPedido, ordemDosCampos, totalDoFormulario, validarPedido } from './regrasCadastroPedido'

const hoje = new Date(2026, 10, 8)
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
    const erros = validarPedido(dados({ clienteNome: ' ', clienteWhatsapp: '', consentimentoLgpd: false, itens: [item({ produtoId: '' })], dataRetirada: '' }), produtos, hoje)
    expect(Object.keys(erros).sort()).toEqual(['clienteNome', 'clienteWhatsapp', 'consentimentoLgpd', 'dataRetirada', 'item-1-produto'].sort())
    expect(validarPedido(dados({ itens: [item({ quantidade: '' })] }), produtos, hoje)['item-1-quantidade']).toBe('Escreva a quantidade em kg. Ex.: 1,5')
  })

  test('KG aceita fração e UN só inteiro (RN12)', () => {
    expect(validarPedido(dados({ itens: [item({ produtoId: '4', quantidade: '50,5' })] }), produtos, hoje)['item-1-quantidade']).toMatch(/número inteiro/)
    expect(validarPedido(dados({ itens: [item({ produtoId: '4', quantidade: '50' })] }), produtos, hoje)).toEqual({})
    expect(validarPedido(dados({ itens: [item({ quantidade: '0' })] }), produtos, hoje)['item-1-quantidade']).toMatch(/maior que zero/)
  })

  test('não aceita data de retirada que já passou, mas aceita hoje', () => {
    expect(validarPedido(dados({ dataRetirada: '2026-11-07' }), produtos, hoje).dataRetirada).toMatch(/já passou/)
    expect(validarPedido(dados({ dataRetirada: '2026-11-08' }), produtos, hoje)).toEqual({})
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
      'dataRetirada', 'observacao',
    ])
  })
})
