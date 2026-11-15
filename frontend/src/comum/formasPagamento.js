// Formas de pagamento que a loja pode aceitar (ZAP-190). A lista é fixa e os códigos são os da
// API (ZAP-192). O pagamento é sempre na retirada (RN19): o sistema só guarda a forma combinada.
// Os nomes são em linguagem simples, sem abreviação solta (NBR 17225 5.12.12).
export const FORMAS_PAGAMENTO = [
  { codigo: 'DINHEIRO', nome: 'Dinheiro' },
  { codigo: 'PIX', nome: 'Pix' },
  { codigo: 'CREDITO', nome: 'Cartão de crédito' },
  { codigo: 'DEBITO', nome: 'Cartão de débito' },
  { codigo: 'VR', nome: 'Vale-refeição (VR)' },
]

export const CODIGOS_PAGAMENTO = FORMAS_PAGAMENTO.map((forma) => forma.codigo)

// Pedido antigo, de antes da ZAP-190, vem sem forma
export const nomeFormaPagamento = (codigo) =>
  FORMAS_PAGAMENTO.find((forma) => forma.codigo === codigo)?.nome ?? 'Não informada'

// Deixa só códigos conhecidos, sem repetir e na ordem da lista, para a tela e a API
export const ordenarFormas = (codigos) => CODIGOS_PAGAMENTO.filter((codigo) => (codigos ?? []).includes(codigo))
