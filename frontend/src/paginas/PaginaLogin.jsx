import { Alert, Button, Stack, Text, TextInput, Title, UnstyledButton } from '@mantine/core'
import { IconAlertCircle, IconEye, IconEyeOff } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import ilustracao1400 from '../assets/ilustracao-login-1400.webp'
import ilustracao2000 from '../assets/ilustracao-login-2000.webp'
import ilustracao2800 from '../assets/ilustracao-login-2800.webp'
import logo from '../assets/zappi-logo.svg'
import zappiNome from '../assets/zappi-nome.svg'
import zappiSimbolo from '../assets/zappi-simbolo.svg'
import { useAutenticacao } from '../autenticacao/AutenticacaoContexto'
import { useMarcaLoja } from '../estabelecimento/useMarcaLoja'
import { CredenciaisInvalidasError, LoginBloqueadoError } from '../autenticacao/servicoAutenticacao'
import classes from './PaginaLogin.module.css'
import { useTituloPagina } from './useTituloPagina'

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// As mensagens não dizem se o erro está no e-mail ou na senha, nem se o e-mail existe
// (critérios da ZAP-16)
function mensagemDeErro(erro) {
  if (erro instanceof CredenciaisInvalidasError) return 'E-mail ou senha incorretos. Confira e tente novamente.'
  if (erro instanceof LoginBloqueadoError) return 'Muitas tentativas sem sucesso. Espere 15 minutos e tente novamente.'
  return 'Não foi possível entrar agora. Tente novamente em alguns minutos.'
}

// Tela de login (US1, RF01, RF02). No computador, ilustração à esquerda e formulário
// à direita; no celular, só o formulário. Rótulos sempre visíveis (NBR 17225 5.3.1),
// erros junto do campo e anunciados ao leitor de tela.
export function PaginaLogin() {
  useTituloPagina('Entrar')
  const { autenticado, entrar } = useAutenticacao()
  const navegar = useNavigate()
  const { state } = useLocation()
  const destino = state?.voltarPara ?? '/pedidos'

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState(
    state?.sessaoExpirada ? 'Sua sessão terminou. Entre de novo para continuar.' : '',
  )
  const [enviando, setEnviando] = useState(false)
  const marca = useMarcaLoja()

  const emailRef = useRef(null)
  const senhaRef = useRef(null)
  const alertaRef = useRef(null)

  useEffect(() => {
    if (erroGeral) alertaRef.current?.focus()
  }, [erroGeral])

  if (autenticado) {
    return <Navigate to={destino} replace />
  }

  async function enviar(evento) {
    evento.preventDefault()
    if (enviando) return

    const novosErros = {}
    const emailLimpo = email.trim()
    if (!emailLimpo) novosErros.email = 'Digite seu e-mail.'
    else if (!EMAIL_VALIDO.test(emailLimpo)) {
      novosErros.email = 'E-mail inválido.'
    }
    if (!senha) novosErros.senha = 'Digite sua senha.'

    setErros(novosErros)
    setErroGeral('')
    if (novosErros.email) return emailRef.current?.focus()
    if (novosErros.senha) return senhaRef.current?.focus()

    setEnviando(true)
    try {
      await entrar(emailLimpo, senha)
      navegar(destino, { replace: true })
    } catch (erro) {
      setSenha('')
      setErroGeral(mensagemDeErro(erro))
    } finally {
      setEnviando(false)
    }
  }

  const botaoVerSenha = (
    <UnstyledButton
      className={classes.verSenha}
      onClick={() => setVerSenha((v) => !v)}
      aria-pressed={verSenha}
      aria-controls="senha"
    >
      {verSenha ? <IconEyeOff size={20} aria-hidden /> : <IconEye size={20} aria-hidden />}
      {verSenha ? 'Esconder' : 'Mostrar'}
    </UnstyledButton>
  )

  return (
    <main className={classes.tela}>
      <div className={classes.ilustracao} aria-hidden="true">
        {/* Três tamanhos da ilustração ampliada: o navegador baixa só o que a tela precisa.
            O painel ocupa cerca de 54% da largura e, em janelas mais altas, é a altura que manda. */}
        <img
          src={ilustracao2000}
          srcSet={`${ilustracao1400} 1400w, ${ilustracao2000} 2000w, ${ilustracao2800} 2800w`}
          sizes="(min-width: 64em) max(54vw, 97vh), 1px"
          alt=""
        />
      </div>

      <div className={classes.ladoFormulario}>
        <Stack className={classes.cartao}>
          {/* Collab: logo da loja (o mesmo do Meu estabelecimento) e, embaixo, o Zappi com o nome
              ao lado do símbolo. Sem logo da loja, fica só a marca do Zappi com o slogan. */}
          {marca?.logo ? (
            <div className={`${classes.marca} ${classes.marcaCollab}`}>
              <img src={marca.logo} alt={`Logo de ${marca.nome}`} className={classes.logoLoja} />
              <div className={classes.zappiLinha}>
                <img src={zappiSimbolo} alt="" className={classes.zappiSimbolo} />
                <img src={zappiNome} alt="Zappi" className={classes.zappiNome} />
              </div>
            </div>
          ) : (
            <div className={classes.marca}>
              <img src={logo} alt="Zappi" className={classes.logo} />
              <Text className={classes.slogan}>Seu cardápio, direto no zap.</Text>
            </div>
          )}

          {/* Título só para leitores de tela: nomeia o formulário sem aparecer na tela */}
          <Title order={1} id="tituloLogin" className={classes.somenteLeitor}>
            Entrar no painel
          </Title>

          {erroGeral && (
            <Alert
              ref={alertaRef}
              tabIndex={-1}
              role="alert"
              color="#b42318"
              variant="outline"
              icon={<IconAlertCircle size={22} aria-hidden />}
              className={classes.alerta}
            >
              {erroGeral}
            </Alert>
          )}

          <form onSubmit={enviar} noValidate aria-labelledby="tituloLogin" className={classes.formulario}>
            <TextInput
              ref={emailRef}
              id="email"
              label="E-mail"
              type="email"
              inputMode="email"
              autoComplete="username"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.currentTarget.value)
                setErros((atual) => ({ ...atual, email: undefined }))
              }}
              error={erros.email}
              classNames={{ label: classes.rotulo, input: classes.campo, error: classes.erroCampo }}
            />

            <TextInput
              ref={senhaRef}
              id="senha"
              label="Senha"
              type={verSenha ? 'text' : 'password'}
              autoComplete="current-password"
              value={senha}
              onChange={(e) => {
                setSenha(e.currentTarget.value)
                setErros((atual) => ({ ...atual, senha: undefined }))
              }}
              error={erros.senha}
              rightSection={botaoVerSenha}
              rightSectionWidth={116}
              rightSectionPointerEvents="all"
              classNames={{ label: classes.rotulo, input: classes.campo, error: classes.erroCampo }}
            />

            <Button type="submit" fullWidth loading={enviando} loaderProps={{ type: 'dots' }} className={classes.botao}>
              Entrar
            </Button>
          </form>
        </Stack>
      </div>
    </main>
  )
}
