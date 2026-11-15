// Regras da página pública do cardápio (ZAP-100 / US9, layout H aprovado na ZAP-105)
import { mascaraTelefone, soDigitos, whatsappParaTela } from '../estabelecimento/regrasEstabelecimento'
import { moeda } from '../pedidos/regrasPedidos'
import { emPromocao, percentualDesconto, precoVigente, UNIDADES } from '../produtos/regrasProdutos'

// Regras da encomenda, iguais para toda loja: não dependem de cadastro (RN19, RN22 e CDC)
export const REGRAS_ENCOMENDA = [
  { icone: 'calendario', titulo: 'Antecedência', texto: 'Encomende com pelo menos 7 dias.' },
  { icone: 'retirada', titulo: 'Retirada', texto: 'Na data combinada. Não há entrega.' },
  { icone: 'pagamento', titulo: 'Pagamento', texto: 'Na retirada.' },
  { icone: 'confirmacao', titulo: 'Confirmação', texto: 'O pedido vale depois da confirmação da loja pelo WhatsApp.' },
]

// Formas de pagamento aceitas na retirada (RN19: o sistema não registra pagamento). Fixas por
// enquanto: o cadastro da loja não tem esse campo.
export const FORMAS_PAGAMENTO = [
  { id: 'pix', nome: 'Pix' },
  { id: 'credito', nome: 'Crédito' },
  { id: 'debito', nome: 'Débito' },
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
// Com promoção, o preço com desconto (ZAP-162)
export const precoTexto = (produto) => moeda(precoVigente(produto))

// Seção automática "Promoções" no topo do cardápio (ZAP-162): com o destaque ligado e sem busca,
// os produtos em promoção na ordem das categorias da loja. Eles continuam também na categoria.
// Na busca, a seção sai, para o produto não aparecer duas vezes no resultado.
// O que o leitor de tela ouve no lugar do preço riscado: "De R$ 115,00 por R$ 100,00 por kg, 13% de desconto"
export function textoPrecoLido(produto) {
  const percentual = percentualDesconto(produto)
  const precos = `De ${moeda(produto.preco)} por ${moeda(produto.precoPromocional)} ${unidadeTexto(produto)}`
  return percentual >= 1 ? `${precos}, ${percentual}% de desconto` : precos
}

export const ID_PROMOCOES = 'promocoes'
export function secaoPromocoes(categorias, { destacar, buscando }) {
  if (!destacar || buscando) return null
  const produtos = categorias.flatMap((c) => c.produtos).filter(emPromocao)
  return produtos.length ? { id: ID_PROMOCOES, titulo: 'Promoções', produtos, promocoes: true } : null
}
export const unidadeTexto = (produto) => UNIDADES[produto.unidade]?.selo ?? ''

// As seções são as categorias cadastradas no painel (ZAP-136, ZAP-140), na ordem que a loja
// definiu, com o nome como foi cadastrado. Categoria sem produto não vira seção. Produto sem
// categoria conhecida fica em "Outros", no fim.
export function agruparPorCategoria(produtos, categorias = []) {
  const grupos = categorias
    .map((categoria) => ({ id: categoria.id, titulo: categoria.nome, produtos: produtos.filter((p) => p.categoriaId === categoria.id) }))
    .filter((grupo) => grupo.produtos.length > 0)
  const ids = new Set(categorias.map((categoria) => categoria.id))
  const semCategoria = produtos.filter((p) => !ids.has(p.categoriaId))
  return semCategoria.length ? [...grupos, { id: 'outros', titulo: 'Outros', produtos: semCategoria }] : grupos
}

// Busca na tela, sobre os produtos já carregados, sem acento e sem maiúsculas (ZAP-100), pelo
// nome do produto, pela descrição e pelo nome da categoria (ZAP-140)
const semAcento = (texto) => String(texto ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
export function filtrarProdutos(produtos, busca) {
  const termo = semAcento(busca).trim()
  if (!termo) return produtos
  return produtos.filter((p) => semAcento(`${p.nome} ${p.descricao} ${p.categoria}`).includes(termo))
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
  return `Olá! Vi o cardápio da ${loja.nome} no Zappi e quero encomendar: ${produto.nome} (${precoTexto(produto)} ${unidadeTexto(produto)}).${obs ? ` Observação: ${obs}` : ''}`
}
