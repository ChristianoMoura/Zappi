import { IconBrandWhatsapp, IconPhotoOff } from '@tabler/icons-react'
import zappiNomeCreme from '../assets/zappi-nome-creme.svg'
import zappiNome from '../assets/zappi-nome.svg'
import zappiSimboloCreme from '../assets/zappi-simbolo-creme.svg'
import zappiSimbolo from '../assets/zappi-simbolo.svg'
import { linkWhatsapp, precoTexto, unidadeTexto } from '../cardapio/regrasCardapio'
import { juntar } from '../cardapio/juntarClasses'
import { iniciaisDaLoja } from '../estabelecimento/useMarcaLoja'
import classes from './PaginaCardapio.module.css'

// Partes usadas pelo cardápio público, pelo detalhe do produto e pelo "Seu pedido"

export function Rodape({ escuro }) {
  return (
    <p className={classes.rodape}>
      Cardápio feito com o
      <img src={escuro ? zappiSimboloCreme : zappiSimbolo} alt="" />
      <img src={escuro ? zappiNomeCreme : zappiNome} alt="Zappi" />
    </p>
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

export function Preco({ produto, className }) {
  return (
    <span className={juntar(classes.preco, className)}>
      {precoTexto(produto)} <small>{unidadeTexto(produto)}</small>
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
