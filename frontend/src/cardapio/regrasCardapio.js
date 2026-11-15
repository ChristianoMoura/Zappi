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

// Formas de pagamento aceitas na retirada (RN19: o sistema não registra pagamento). Vêm do
// cadastro da loja (ZAP-193, ZAP-194), na ordem da lista. Sem o campo na API (backend antigo), a
// tela mostra as três de antes e o pedido não pergunta a forma.
const FORMAS_SEM_CADASTRO = ['PIX', 'CREDITO', 'DEBITO']
export const formasDaLoja = (loja) => loja.formasPagamento ?? FORMAS_SEM_CADASTRO
export const pedeFormaPagamento = (loja) => Array.isArray(loja.formasPagamento) && loja.formasPagamento.length > 0

// A escolha do pedido só vale se a loja ainda aceita a forma; com uma forma só, ela já vem escolhida
export function formaEscolhida(loja, escolhida) {
  if (!pedeFormaPagamento(loja)) return ''
  if (loja.formasPagamento.includes(escolhida)) return escolhida
  return loja.formasPagamento.length === 1 ? loja.formasPagamento[0] : ''
}

// Endereço de retirada (ZAP-186): o cadastrado na tela Estabelecimento, que vem no cardápio
// público (ZAP-185). Completo é rua, número e cidade; sem um deles, devolve nulo e a tela pede
// para combinar o local pelo WhatsApp. As linhas são como a tela mostra; o texto, numa linha só,
// vai no título do mapa e na busca do Google Maps
export function enderecoDaLoja(loja) {
  const e = loja?.endereco
  if (!e?.logradouro?.trim() || !e.numero?.trim() || !e.cidade?.trim()) return null
  const rua = [e.logradouro, e.numero, e.complemento].map((x) => x?.trim()).filter(Boolean).join(', ')
  const cidade = e.uf?.trim() ? `${e.cidade.trim()}/${e.uf.trim()}` : e.cidade.trim()
  const lugar = e.bairro?.trim() ? `${e.bairro.trim()}, ${cidade}` : cidade
  const cep = soDigitos(e.cep)
  const linhas = [rua, lugar]
  if (cep.length === 8) linhas.push(`CEP ${cep.slice(0, 5)}-${cep.slice(5)}`)
  return { linhas, texto: linhas.join(' · '), busca: [rua, lugar, cep.length === 8 ? cep : ''].filter(Boolean).join(', ') }
}

// Abre o endereço no Google Maps (site ou aplicativo), onde o cliente traça a rota
export const linkGoogleMaps = (endereco) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco.busca)}`

// Mapa embutido da Maps Embed API; sem a chave (ZAP-184), nulo, e a tela fica sem o mapa
export const mapaGoogle = (endereco, chave) =>
  chave ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(chave)}&q=${encodeURIComponent(endereco.busca)}` : null

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
