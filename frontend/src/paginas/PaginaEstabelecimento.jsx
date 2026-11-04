import { Alert, Button, Loader, NativeSelect, Textarea, TextInput, Title } from '@mantine/core'
import { IconAlertCircle, IconBuildingStore, IconCheck, IconDeviceFloppy, IconMapPin, IconPhone } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import capa from '../assets/capa-estabelecimento.webp'
import {
  LIMITES,
  mascaraCep,
  mascaraTelefone,
  soDigitos,
  UFS,
  validarEstabelecimento,
  whatsappParaGuardar,
  whatsappParaTela,
} from '../estabelecimento/regrasEstabelecimento'
import { buscarEstabelecimento, LinkEmUsoError, salvarEstabelecimento } from '../estabelecimento/servicoEstabelecimento'
import classes from './PaginaEstabelecimento.module.css'
import { useTituloPagina } from './useTituloPagina'

// Ordem dos campos na tela, usada para levar o foco ao primeiro erro (NBR 17225 5.1.4)
const ORDEM = ['nome', 'descricao', 'slug', 'whatsapp', 'emailContato', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'uf', 'cidade']

const paraTela = (guardado) => ({ ...guardado, whatsapp: whatsappParaTela(guardado.whatsapp) })
const paraGuardar = (tela) => ({ ...tela, nome: tela.nome.trim(), slug: tela.slug.trim(), whatsapp: whatsappParaGuardar(tela.whatsapp), cep: soDigitos(tela.cep) })
const iniciais = (nome) => (nome.trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2) || 'Z').toUpperCase()

// Tela "Meu estabelecimento" (US2, RF03, RF04): layout A aprovado pelo grupo, com capa,
// logo da loja e os dados em três cartões. Só nome, link do cardápio e WhatsApp são obrigatórios.
export function PaginaEstabelecimento() {
  useTituloPagina('Meu estabelecimento')
  const [salvo, setSalvo] = useState(null)
  const [dados, setDados] = useState(null)
  const [erros, setErros] = useState({})
  const [carregando, setCarregando] = useState(true)
  const [erroCarregar, setErroCarregar] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [acabouDeSalvar, setAcabouDeSalvar] = useState(false)
  const [aviso, setAviso] = useState(null)
  const refs = useRef({})

  useEffect(() => {
    let ativo = true
    buscarEstabelecimento()
      .then((resposta) => {
        if (!ativo) return
        setSalvo(paraTela(resposta))
        setDados(paraTela(resposta))
      })
      .catch(() => {
        if (ativo) setErroCarregar(true)
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [])

  useEffect(() => {
    if (!aviso) return undefined
    const tempo = setTimeout(() => setAviso(null), 3500)
    return () => clearTimeout(tempo)
  }, [aviso])

  if (carregando) {
    return (
      <div className={classes.estado} role="status">
        <Loader color="zappi" type="dots" />
        Carregando os dados da confeitaria…
      </div>
    )
  }

  if (erroCarregar) {
    return (
      <Alert color="#b42318" variant="outline" icon={<IconAlertCircle size={22} aria-hidden />} className={classes.erroCarregar}>
        Não foi possível carregar os dados agora. Tente de novo em alguns minutos.
      </Alert>
    )
  }

  const alterou = JSON.stringify(dados) !== JSON.stringify(salvo)
  const errosAtuais = validarEstabelecimento(dados)
  const confirmado = (campo) => String(dados[campo] ?? '').trim() !== '' && !errosAtuais[campo]

  function mudar(campo, valor) {
    setDados((atual) => ({ ...atual, [campo]: valor }))
    if (erros[campo]) setErros((atual) => { const resto = { ...atual }; delete resto[campo]; return resto })
  }

  async function salvar() {
    const novosErros = validarEstabelecimento(dados)
    setErros(novosErros)
    const primeiro = ORDEM.find((campo) => novosErros[campo])
    if (primeiro) {
      refs.current[primeiro]?.focus()
      setAviso({ tipo: 'erro', texto: 'Confira os campos marcados em vermelho.' })
      return
    }

    setSalvando(true)
    try {
      const resposta = paraTela(await salvarEstabelecimento(paraGuardar(dados)))
      setSalvo(resposta)
      setDados(resposta)
      setAviso({ tipo: 'ok', texto: 'Dados salvos.' })
      setAcabouDeSalvar(true)
      setTimeout(() => setAcabouDeSalvar(false), 1600)
    } catch (erro) {
      if (erro instanceof LinkEmUsoError) {
        setErros({ slug: 'Esse link já é usado por outra confeitaria. Escolha outro.' })
        refs.current.slug?.focus()
        setAviso({ tipo: 'erro', texto: 'Confira o link do cardápio.' })
      } else {
        setAviso({ tipo: 'erro', texto: 'Não foi possível salvar agora. Tente de novo em alguns minutos.' })
      }
    } finally {
      setSalvando(false)
    }
  }

  function desfazer() {
    setDados(salvo)
    setErros({})
    setAviso({ tipo: 'ok', texto: 'Alterações desfeitas.' })
  }

  // Campo com rótulo sempre visível, check de "confirmado" e mensagem de erro ligada ao campo
  const propsCampo = (campo, rotulo, { obrigatorio = false, dica } = {}) => ({
    id: `estabelecimento-${campo}`,
    ref: (el) => {
      refs.current[campo] = el
    },
    label: (
      <>
        {rotulo}
        {obrigatorio && <span className={classes.obrigatorio}> (obrigatório)</span>}
        {confirmado(campo) && <IconCheck size={18} stroke={3} className={classes.confirmado} aria-hidden />}
      </>
    ),
    description: dica,
    error: erros[campo],
    'aria-required': obrigatorio || undefined,
    maxLength: LIMITES[campo],
    classNames: { label: classes.rotulo, input: classes.campo, error: classes.erroCampo, description: classes.dica },
  })

  let ordem = 0
  // Entrada suave em sequência: junta a classe do bloco com a da animação
  const entrada = (classe = '') => ({ className: `${classe} ${classes.entrada}`.trim(), style: { '--i': ordem++ } })

  return (
    <div className={classes.pagina}>
      <div {...entrada(classes.capa)}>
        <img src={capa} alt="" />
      </div>

      <div className={classes.perfil}>
        <div className={`${classes.avatar} ${classes.avatarEntrada}`} aria-hidden="true">
          {iniciais(dados.nome)}
        </div>
        <div {...entrada(classes.perfilTexto)}>
          <p className={classes.nome}>{dados.nome.trim() || 'Sua confeitaria'}</p>
          {dados.descricao ? <p className={classes.descricao}>{dados.descricao}</p> : null}
        </div>
      </div>

      <div {...entrada()}>
        <Title order={1} className={classes.titulo}>
          Meu estabelecimento
        </Title>
        <p className={classes.subtitulo}>Esses dados aparecem para os seus clientes.</p>
      </div>

      <form
        className={classes.cartoes}
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault()
          void salvar()
        }}
      >
        <section aria-labelledby="secao-sobre" {...entrada(`${classes.cartao} ${classes.inteiro}`)}>
          <h2 id="secao-sobre" className={classes.tituloCartao}>
            <span className={classes.icone}><IconBuildingStore size={20} aria-hidden /></span>
            Sobre a confeitaria
          </h2>
          <div className={classes.campos}>
            <TextInput {...propsCampo('nome', 'Nome da confeitaria', { obrigatorio: true })} value={dados.nome} onChange={(e) => mudar('nome', e.currentTarget.value)} />
            <div>
              <Textarea
                {...propsCampo('descricao', 'Descrição', { dica: 'Conte em poucas palavras o que você faz.' })}
                value={dados.descricao}
                onChange={(e) => mudar('descricao', e.currentTarget.value)}
                autosize
                minRows={3}
                classNames={{ label: classes.rotulo, input: classes.campoTexto, error: classes.erroCampo, description: classes.dica }}
              />
              <p className={classes.contador} aria-live="polite">
                {dados.descricao.length} / {LIMITES.descricao}
              </p>
            </div>
            <TextInput
              {...propsCampo('slug', 'Link do cardápio', { obrigatorio: true, dica: 'Use só letras minúsculas, números e hífen. Ex.: casa-belt' })}
              value={dados.slug}
              onChange={(e) => mudar('slug', e.currentTarget.value)}
              leftSection={<span className={classes.prefixo}>cardápio /</span>}
              leftSectionWidth={100}
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
        </section>

        <section aria-labelledby="secao-contato" {...entrada(classes.cartao)}>
          <h2 id="secao-contato" className={classes.tituloCartao}>
            <span className={classes.icone}><IconPhone size={20} aria-hidden /></span>
            Contato
          </h2>
          <div className={classes.campos}>
            <TextInput
              {...propsCampo('whatsapp', 'WhatsApp', { obrigatorio: true, dica: 'Com DDD. É por aqui que os clientes falam com você.' })}
              value={mascaraTelefone(dados.whatsapp)}
              onChange={(e) => mudar('whatsapp', soDigitos(e.currentTarget.value).slice(0, 11))}
              leftSection={<span className={classes.prefixo}>+55</span>}
              leftSectionWidth={56}
              inputMode="tel"
              autoComplete="tel-national"
              maxLength={15}
            />
            <TextInput
              {...propsCampo('emailContato', 'E-mail')}
              type="email"
              autoComplete="email"
              value={dados.emailContato}
              onChange={(e) => mudar('emailContato', e.currentTarget.value)}
            />
          </div>
        </section>

        <section aria-labelledby="secao-endereco" {...entrada(classes.cartao)}>
          <h2 id="secao-endereco" className={classes.tituloCartao}>
            <span className={classes.icone}><IconMapPin size={20} aria-hidden /></span>
            Endereço
          </h2>
          <div className={classes.endereco}>
            <TextInput
              {...propsCampo('cep', 'CEP')}
              value={mascaraCep(dados.cep)}
              onChange={(e) => mudar('cep', soDigitos(e.currentTarget.value).slice(0, 8))}
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={9}
            />
            <TextInput {...propsCampo('logradouro', 'Rua')} className={classes.largo} value={dados.logradouro} onChange={(e) => mudar('logradouro', e.currentTarget.value)} autoComplete="address-line1" />
            <TextInput {...propsCampo('numero', 'Número', { dica: 'Pode ser "s/n".' })} value={dados.numero} onChange={(e) => mudar('numero', e.currentTarget.value)} />
            <TextInput {...propsCampo('complemento', 'Complemento')} className={classes.largo} value={dados.complemento} onChange={(e) => mudar('complemento', e.currentTarget.value)} />
            <TextInput {...propsCampo('bairro', 'Bairro')} value={dados.bairro} onChange={(e) => mudar('bairro', e.currentTarget.value)} />
            <NativeSelect
              {...propsCampo('uf', 'Estado')}
              data={[{ value: '', label: 'Escolha' }, ...UFS]}
              value={dados.uf}
              onChange={(e) => mudar('uf', e.currentTarget.value)}
            />
            <TextInput {...propsCampo('cidade', 'Cidade')} className={classes.largo} value={dados.cidade} onChange={(e) => mudar('cidade', e.currentTarget.value)} autoComplete="address-level2" />
          </div>
        </section>

        <div className={classes.rodape}>
          <span className={classes.situacao} aria-live="polite">
            {alterou ? 'Você tem alterações não salvas' : 'Tudo salvo'}
          </span>
          <Button variant="outline" onClick={desfazer} disabled={!alterou || salvando}>
            Desfazer
          </Button>
          <Button
            type="submit"
            loading={salvando}
            loaderProps={{ type: 'dots' }}
            color={acabouDeSalvar ? '#1d6b45' : undefined}
            leftSection={acabouDeSalvar ? <IconCheck size={22} aria-hidden className={classes.checkSalvo} /> : <IconDeviceFloppy size={22} aria-hidden />}
          >
            {acabouDeSalvar ? 'Salvo' : <>Salvar<span className={classes.someNoCelular}> alterações</span></>}
          </Button>
        </div>
      </form>

      {aviso && (
        <div className={`${classes.aviso} ${aviso.tipo === 'ok' ? classes.avisoOk : classes.avisoErro}`} role={aviso.tipo === 'ok' ? 'status' : 'alert'}>
          {aviso.tipo === 'ok' ? <IconCheck size={20} aria-hidden /> : <IconAlertCircle size={20} aria-hidden />}
          {aviso.texto}
        </div>
      )}
    </div>
  )
}
