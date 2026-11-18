import { IconArrowLeft } from '@tabler/icons-react'
import { Fragment, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import logo from '../assets/zappi-logo.svg'
import { useAutenticacao } from '../autenticacao/AutenticacaoContexto'
import { buscarTermosAceitos } from '../autenticacao/servicoTermos'
import { DOCUMENTOS, lerBlocos, lerTrechos } from '../termos/textoLegal'
import classes from './PaginaTextoLegal.module.css'
import { useTituloPagina } from './useTituloPagina'

// Páginas /termos e /privacidade (ZAP-148), sem login, para os dois portais. O texto é o de docs/
// (ZAP-144), com a versão e a data no topo. Com a Lídia logada, a página mostra quando ela aceitou
// e o botão "Voltar ao painel"; sem login, o "Voltar" leva para a página de antes, se houver.

function Trechos({ linha }) {
  return lerTrechos(linha).map((trecho) => {
    if (trecho.tipo === 'negrito') return <strong key={trecho.posicao}>{trecho.texto}</strong>
    if (trecho.tipo === 'codigo') return <code key={trecho.posicao}>{trecho.texto}</code>
    if (trecho.tipo === 'link' && trecho.externo) {
      return (
        <a key={trecho.posicao} href={trecho.destino} target="_blank" rel="noopener noreferrer">
          {trecho.texto}
          <span className={classes.somenteLeitor}> (abre em outra aba)</span>
        </a>
      )
    }
    if (trecho.tipo === 'link') {
      return (
        <Link key={trecho.posicao} to={trecho.destino}>
          {trecho.texto}
        </Link>
      )
    }
    return <Fragment key={trecho.posicao}>{trecho.texto}</Fragment>
  })
}

function Bloco({ bloco }) {
  if (bloco.tipo === 'titulo') {
    const Titulo = `h${bloco.nivel}`
    return (
      <Titulo>
        <Trechos linha={bloco.texto} />
      </Titulo>
    )
  }
  if (bloco.tipo === 'linha') return <hr />
  if (bloco.tipo === 'resumo') {
    return (
      <p className={classes.resumo}>
        <Trechos linha={bloco.texto} />
      </p>
    )
  }
  if (bloco.tipo === 'lista') {
    return (
      <ul className={bloco.letras ? classes.letras : undefined}>
        {bloco.itens.map((item) => (
          <li key={item.linha}>
            <Trechos linha={item.texto} />
          </li>
        ))}
      </ul>
    )
  }
  return (
    <p>
      <Trechos linha={bloco.texto} />
    </p>
  )
}

// "2026-11-17T21:30:00Z" → "17/11/2026", no horário de São Paulo
function dataDoAceite(aceitoEm) {
  return new Date(aceitoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

export function PaginaTextoLegal({ documento }) {
  const { texto, titulo } = DOCUMENTOS[documento]
  useTituloPagina(titulo)
  const { autenticado, token } = useAutenticacao()
  const navegar = useNavigate()
  // A primeira página aberta no navegador tem a chave 'default': aí não há para onde voltar
  const { key, pathname } = useLocation()
  const [aceite, setAceite] = useState(null)

  useEffect(() => {
    let ativo = true
    // O serviço já devolve nulo quando algo dá errado; o catch é só uma garantia: sem a resposta,
    // a página continua sem a frase do aceite
    buscarTermosAceitos(autenticado ? token : null)
      .then((resposta) => {
        if (ativo) setAceite(resposta)
      })
      .catch(() => {
        if (ativo) setAceite(null)
      })
    return () => {
      ativo = false
    }
  }, [autenticado, token])

  // Trocar entre /termos e /privacidade pelo link do texto começa a leitura do topo
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className={classes.pagina}>
      <header className={classes.topo}>
        <div className={classes.barra}>
          {autenticado ? (
            <Link to="/pedidos" className={classes.voltar}>
              <IconArrowLeft size={20} aria-hidden />
              Voltar ao painel
            </Link>
          ) : (
            key !== 'default' && (
              <button type="button" className={classes.voltar} onClick={() => navegar(-1)}>
                <IconArrowLeft size={20} aria-hidden />
                Voltar
              </button>
            )
          )}
          <img src={logo} alt="Zappi" className={classes.logo} />
        </div>
      </header>

      {/* O título e a versão vêm primeiro; logo depois, quando a Lídia aceitou */}
      <main className={classes.texto}>
        {lerBlocos(texto).map((bloco, ordem) => (
          <Fragment key={bloco.linha}>
            <Bloco bloco={bloco} />
            {ordem === 1 && aceite && (
              // <output> já é um aviso (papel "status") para o leitor de tela, como pede o SonarCloud
              <output className={classes.aceite}>
                Você aceitou a versão {aceite.versao} em {dataDoAceite(aceite.aceitoEm)}.
              </output>
            )}
          </Fragment>
        ))}
      </main>
    </div>
  )
}
