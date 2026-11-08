// Regras dos campos do estabelecimento (ZAP-26, tabela `estabelecimento` do context.md).
// O backend (ZAP-36) valida de novo; aqui as regras servem para avisar a Lídia antes de salvar.

export const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']

export const LIMITES = {
  nome: 100,
  slug: 60,
  descricao: 500,
  emailContato: 150,
  logradouro: 150,
  numero: 10,
  complemento: 60,
  bairro: 80,
  cidade: 80,
}

// Endereço sem número: a caixa "Sem número" guarda este valor no campo numero
export const SEM_NUMERO = 'S/N'

// Fotos de capa e logo: mesma regra da foto do produto (JPG, PNG ou WebP de até 5 MB)
export { TAMANHO_MAX_FOTO, TIPOS_FOTO, validarFoto } from '../comum/regrasFoto'

export const soDigitos =(texto) => String(texto ?? '').replace(/\D/g, '')

// O WhatsApp é guardado com 13 dígitos (DDI 55 + DDD + número). A tela mostra o +55 fixo
// e a Lídia digita só DDD e número, como está acostumada.
export const whatsappParaTela = (guardado) => soDigitos(guardado).replace(/^55(?=\d{10,11}$)/, '')
export const whatsappParaGuardar = (digitado) => {
  const digitos = soDigitos(digitado)
  return digitos ? `55${digitos}` : ''
}

export function mascaraTelefone(digitado) {
  const d = soDigitos(digitado).slice(0, 11)
  if (d.length <= 2) return d ? `(${d}` : ''
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`
}

export function mascaraCep(digitado) {
  const d = soDigitos(digitado).slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

// Recebe os dados como a tela os mostra (WhatsApp sem o 55) e devolve { campo: mensagem }
export function validarEstabelecimento(dados) {
  const erros = {}

  if (!dados.nome.trim()) erros.nome = 'Digite o nome do estabelecimento.'

  if (!dados.slug.trim()) erros.slug = 'Digite o link do cardápio.'
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(dados.slug)) {
    erros.slug = 'Use só letras minúsculas, números e hífen, sem espaços. Ex.: casa-belt'
  }

  const whatsapp = soDigitos(dados.whatsapp)
  if (!whatsapp) erros.whatsapp = 'Digite o WhatsApp com DDD.'
  else if (whatsapp.length !== 11) erros.whatsapp = 'O WhatsApp precisa ter DDD e 9 números. Ex.: (11) 90000-0000'

  if (dados.emailContato && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.emailContato)) {
    erros.emailContato = 'E-mail inválido.'
  }

  if (dados.cep && soDigitos(dados.cep).length !== 8) erros.cep = 'O CEP tem 8 números. Ex.: 01000-000'
  if (dados.uf && !UFS.includes(dados.uf)) erros.uf = 'Escolha o estado na lista.'

  for (const [campo, limite] of Object.entries(LIMITES)) {
    if (!erros[campo] && String(dados[campo] ?? '').length > limite) erros[campo] = `Use no máximo ${limite} caracteres.`
  }

  return erros
}
