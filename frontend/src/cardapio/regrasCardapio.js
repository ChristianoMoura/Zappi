// Regras da página pública do cardápio (ZAP-100 / US9, layout H aprovado na ZAP-105)
import { mascaraTelefone, soDigitos, whatsappParaTela } from '../estabelecimento/regrasEstabelecimento'
import { moeda } from '../pedidos/regrasPedidos'
import { UNIDADES } from '../produtos/regrasProdutos'

// Regras da encomenda, iguais para toda loja: não dependem de cadastro (RN19, RN22 e CDC)
export const REGRAS_ENCOMENDA = [
  { icone: 'calendario', titulo: 'Antecedência', texto: 'Encomende com pelo menos 7 dias.' },
  { icone: 'retirada', titulo: 'Retirada', texto: 'Na data combinada. Não há entrega.' },
  { icone: 'pagamento', titulo: 'Pagamento', texto: 'Na retirada.' },
  { icone: 'confirmacao', titulo: 'Confirmação', texto: 'O pedido vale depois da confirmação da loja pelo WhatsApp.' },
]

// Local de retirada mostrado no mapa de "Mais informações". Por enquanto é um endereço
// fictício, só para representar o mapa: o banco não tem um ponto de retirada, e a API pública
// não expõe o endereço da loja, que é a casa da Lídia (LGPD). Quando houver um ponto de
// retirada cadastrado, ele vem da API no lugar deste.
export const PONTO_RETIRADA_EXEMPLO = {
  endereco: 'Rua das Confeiteiras, 120 — Vila Doce, São Paulo/SP',
  latitude: -23.5505,
  longitude: -46.6333,
  ilustrativo: true,
}

export const AVISO_ENCOMENDA ='Encomendas com pelo menos 7 dias de antecedência · Retirada, sem entrega'

// Preço sempre com a unidade ao lado (CDC): "R$ 100,00" e "por kg"
export const precoTexto = (produto) => moeda(produto.preco)
export const unidadeTexto = (produto) => UNIDADES[produto.unidade]?.selo ?? ''

// "Bolo" vira "Bolos" e "Salgado" vira "Salgados". Nomes que não terminam em vogal simples
// ("Pão", "Pastel") ficam como estão, para não errar o plural
export function plural(nome) {
  const limpo = nome.trim()
  return /[aeiou]$/i.test(limpo) && !/[ãõ][oe]$/i.test(limpo) ? `${limpo}s` : limpo
}

// id usado na âncora da seção: "Bolo" → "bolo", "Pão de mel" → "pao-de-mel"
export const idCategoria = (nome) =>
  nome.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// As categorias são os nomes dos produtos (Bolo, Salgado...), na ordem em que aparecem no cardápio
export function agruparPorCategoria(produtos) {
  const grupos = new Map()
  for (const produto of produtos) {
    const id = idCategoria(produto.nome) || 'outros'
    if (!grupos.has(id)) grupos.set(id, { id, titulo: plural(produto.nome) || 'Outros', produtos: [] })
    grupos.get(id).produtos.push(produto)
  }
  return [...grupos.values()]
}

// Busca na tela, sobre os produtos já carregados, sem acento e sem maiúsculas (ZAP-100)
const semAcento = (texto) => String(texto ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
export function filtrarProdutos(produtos, busca) {
  const termo = semAcento(busca).trim()
  if (!termo) return produtos
  return produtos.filter((p) => semAcento(`${p.nome} ${p.sabor} ${p.descricao}`).includes(termo))
}

// Telefone como a tela mostra: "(11) 90000-0000"
export const telefoneTexto = (whatsapp) => mascaraTelefone(whatsappParaTela(whatsapp))

// Link do WhatsApp da loja, com o DDI 55 quando faltar
export function linkWhatsapp(whatsapp, texto) {
  const digitos = soDigitos(whatsapp)
  const numero = digitos.length <= 11 ? `55${digitos}` : digitos
  return `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`
}

export const mensagemContato = (loja) => `Olá! Vi o cardápio da ${loja.nome} no Zappi e queria tirar uma dúvida.`

// Mensagem do botão "Pedir pelo WhatsApp", com a observação que o cliente escreveu
export function mensagemPedido(loja, produto, observacao = '') {
  const obs = observacao.trim()
  return `Olá! Vi o cardápio da ${loja.nome} no Zappi e quero encomendar: ${produto.sabor} (${precoTexto(produto)} ${unidadeTexto(produto)}).${obs ? ` Observação: ${obs}` : ''}`
}
