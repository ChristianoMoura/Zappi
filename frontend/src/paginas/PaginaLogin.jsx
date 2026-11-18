import { Alert, Button, Checkbox, Stack, Text, TextInput, Title, UnstyledButton } from '@mantine/core'
import { IconAlertCircle, IconEye, IconEyeOff } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import ilustracao1400 from '../assets/ilustracao-login-1400.webp'
import ilustracao2000 from '../assets/ilustracao-login-2000.webp'
import ilustracao2800 from '../assets/ilustracao-login-2800.webp'
import logo from '../assets/zappi-logo.svg'
import { useAutenticacao } from '../autenticacao/AutenticacaoContexto'
import { emailValido } from '../comum/email'
import { CredenciaisInvalidasError, LoginBloqueadoError, TermosPendentesError } from '../autenticacao/servicoAutenticacao'
import { guardarVersaoAceita, lerVersaoAceita } from '../autenticacao/servicoTermos'
import { useTermosVigentes } from '../autenticacao/useTermosVigentes'
import classes from './PaginaLogin.module.css'
import { useTituloPagina } from './useTituloPagina'


const FALTA_ACEITE = 'Para entrar, marque que leu e concorda com os Termos de uso e a Política de privacidade.'

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
  // Termos de uso e política de privacidade (ZAP-143, ZAP-147): a caixa aparece quando este
  // aparelho não tem o lembrete da versão vigente, ou quando o backend responde TERMOS_PENDENTES
  const termos = useTermosVigentes()
  const [pendente, setPendente] = useState(false)
  const [aceite, setAceite] = useState(false)
  const pedeAceite = Boolean(termos) && (pendente || lerVersaoAceita() !== termos.versao)

  const emailRef = useRef(null)
  const senhaRef = useRef(null)
  const aceiteRef = useRef(null)
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
    else if (!emailValido(emailLimpo)) {
      novosErros.email = 'E-mail inválido.'
    }
    if (!senha) novosErros.senha = 'Digite sua senha.'
    // Sem a caixa marcada, o login nem é enviado (RN26 proposta na ZAP-143)
    if (pedeAceite && !aceite) novosErros.aceite = FALTA_ACEITE

    setErros(novosErros)
    setErroGeral('')
    if (novosErros.email) return emailRef.current?.focus()
    if (novosErros.senha) return senhaRef.current?.focus()
    if (novosErros.aceite) return aceiteRef.current?.focus()

    setEnviando(true)
    try {
      await entrar(emailLimpo, senha, pedeAceite ? { versao: termos.versao } : null)
      if (pedeAceite) guardarVersaoAceita(termos.versao)
      navegar(destino, { replace: true })
    } catch (erro) {
      if (erro instanceof TermosPendentesError && termos) {
        // Senha certa, mas falta o aceite neste aparelho ou o da versão nova: a senha continua
        // digitada, e o foco vai para a caixa
        setPendente(true)
        setAceite(false)
        setErros({ aceite: 'Os termos ainda não foram aceitos neste aparelho ou mudaram. Leia, marque a caixa e entre de novo.' })
        setTimeout(() => aceiteRef.current?.focus())
        return
      }
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
          {/* Só a marca do Zappi com o slogan (decisão de 15/11/2026, ZAP-83): sem login, o front
              não sabe qual é a loja. O logo da loja aparece dentro do painel, na conta (ZAP-178). */}
          <div className={classes.marca}>
            <img src={logo} alt="Zappi" className={classes.logo} />
            <Text className={classes.slogan}>Seu cardápio, direto no zap.</Text>
          </div>

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

            {pedeAceite && (
              <Checkbox
                ref={aceiteRef}
                id="aceite-termos"
                size="md"
                checked={aceite}
                onChange={(e) => {
                  setAceite(e.currentTarget.checked)
                  setErros((atual) => ({ ...atual, aceite: undefined }))
                }}
                label={
                  <>
                    Li e concordo com os <Link to="/termos" className={classes.linkTermos}>Termos de uso</Link> e a{' '}
                    <Link to="/privacidade" className={classes.linkTermos}>Política de privacidade</Link>
                  </>
                }
                description={`Versão ${termos.versao}. Você só precisa aceitar de novo neste aparelho se os textos mudarem.`}
                error={erros.aceite}
                classNames={{ label: classes.rotuloAceite, description: classes.dicaAceite, error: classes.erroCampo }}
              />
            )}

            <Button type="submit" fullWidth loading={enviando} loaderProps={{ type: 'dots' }} className={classes.botao}>
              Entrar
            </Button>
          </form>

          {/* Os textos podem ser lidos sem login (ZAP-143, ZAP-148) */}
          {termos && (
            <nav aria-label="Termos e privacidade" className={classes.rodapeTermos}>
              <Link to="/termos">Termos de uso</Link>
              <span aria-hidden="true">·</span>
              <Link to="/privacidade">Política de privacidade</Link>
            </nav>
          )}
        </Stack>
      </div>
    </main>
  )
}
