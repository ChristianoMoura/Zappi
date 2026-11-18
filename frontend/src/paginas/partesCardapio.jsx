import { IconBrandWhatsapp, IconPhotoOff } from '@tabler/icons-react'
import { Link } from 'react-router'
import { useTermosVigentes } from '../autenticacao/useTermosVigentes'
import zappiNomeCreme from '../assets/zappi-nome-creme.svg'
import zappiNome from '../assets/zappi-nome.svg'
import zappiSimboloCreme from '../assets/zappi-simbolo-creme.svg'
import zappiSimbolo from '../assets/zappi-simbolo.svg'
import { linkWhatsapp, precoTexto, textoPrecoLido, unidadeTexto } from '../cardapio/regrasCardapio'
import { emPromocao, textoDescontoCurto } from '../produtos/regrasProdutos'
import { juntar } from '../cardapio/juntarClasses'
import { iniciaisDaLoja } from '../estabelecimento/useMarcaLoja'
import { moeda } from '../pedidos/regrasPedidos'
import classes from './PaginaCardapio.module.css'

// Partes usadas pelo cardápio público, pelo detalhe do produto e pelo "Seu pedido"

// Links para os termos e a privacidade (ZAP-148), só quando o backend responde a versão vigente:
// o mesmo cuidado da caixa de aceite (ZAP-147)
export function Rodape({ escuro }) {
  const termos = useTermosVigentes()
  return (
    <footer className={classes.rodapePagina}>
      <p className={classes.rodape}>
        Cardápio feito com o
        <img src={escuro ? zappiSimboloCreme : zappiSimbolo} alt="" />
        <img src={escuro ? zappiNomeCreme : zappiNome} alt="Zappi" />
      </p>
      {termos && (
        <nav aria-label="Termos e privacidade" className={classes.linksLegais}>
          <Link to="/termos">Termos de uso</Link>
          <span aria-hidden>·</span>
          <Link to="/privacidade">Política de privacidade</Link>
        </nav>
      )}
    </footer>
  )
}

export function LogoLoja({ loja, className }) {
  if (loja.logo) return <img src={loja.logo} alt={`Logo de ${loja.nome}`} className={className} />
  return (
    <span className={juntar(className, classes.iniciais)} role="img" aria-label={`Logo de ${loja.nome}`}>
      {iniciaisDaLoja(loja.nome)}
    </span>
  )
}

export function Foto({ produto, className, decorativa = false }) {
  return (
    <div className={juntar(classes.foto, className)}>
      {produto.foto ? (
        <img src={produto.foto} alt={decorativa ? '' : produto.textoAlternativo} loading="lazy" />
      ) : (
        <span className={classes.semFoto}>
          <IconPhotoOff size={24} aria-hidden />
          Sem foto
        </span>
      )}
    </div>
  )
}

// Com promoção (ZAP-162), como no painel (ZAP-161): o preço antigo riscado, o novo em verde e o
// "-13%" ao lado da unidade, sempre na mesma linha. O risco não é anunciado pelo leitor de tela,
// então ele ouve "De R$ 115,00 por R$ 100,00 por kg, 13% de desconto".
export function Preco({ produto, className }) {
  if (!emPromocao(produto)) {
    return (
      <span className={juntar(classes.preco, className)}>
        {precoTexto(produto)} <small>{unidadeTexto(produto)}</small>
      </span>
    )
  }
  const desconto = textoDescontoCurto(produto)
  return (
    <span className={juntar(classes.preco, classes.precoPromocao, className)}>
      <span className={classes.somenteLeitor}>{textoPrecoLido(produto)}</span>
      <s aria-hidden="true">{moeda(produto.preco)}</s>
      <span className={classes.precoNovo} aria-hidden="true">
        {precoTexto(produto)}
      </span>
      <span className={classes.unidadeEDesconto} aria-hidden="true">
        <small>{unidadeTexto(produto)}</small>
        {desconto && <span className={classes.descontoCurto}>{desconto}</span>}
      </span>
    </span>
  )
}

export function BotaoWhatsapp({ loja, texto, rotulo, className }) {
  return (
    <a className={juntar(classes.whats, className)} href={linkWhatsapp(loja.whatsapp, texto)} target="_blank" rel="noopener noreferrer">
      <IconBrandWhatsapp size={24} aria-hidden />
      {rotulo}
      <span className={classes.somenteLeitor}> (abre o WhatsApp)</span>
    </a>
  )
}
