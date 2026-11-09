// Endereço pelo CEP no "Meu estabelecimento" (ZAP-121). O navegador consulta a ViaCEP e, se ela
// falhar ou não conhecer o CEP, a BrasilAPI. Só o CEP do estabelecimento sai do sistema, sem
// token e sem dado de cliente (seção 12.1 do context.md). Sem resposta, a Lídia preenche à mão.

export class CepNaoEncontradoError extends Error {}
export class BuscaCepIndisponivelError extends Error {}

// Cada API tem até 5 s: a Lídia não fica esperando um serviço que não responde
const TEMPO_LIMITE = 5000

const NAO_ENCONTRADO = 'nao-encontrado'

async function consultar(endereco) {
  const controle = new AbortController()
  const tempo = setTimeout(() => controle.abort(), TEMPO_LIMITE)
  try {
    const resposta = await fetch(endereco, { signal: controle.signal })
    if (resposta.status === 404 || resposta.status === 400) return NAO_ENCONTRADO
    if (!resposta.ok) return null
    return await resposta.json()
  } catch {
    // Sem conexão, fora do ar ou passou do tempo
    return null
  } finally {
    clearTimeout(tempo)
  }
}

// Respostas: endereço, NAO_ENCONTRADO ou null (falhou)
async function viaCep(cep) {
  const dados = await consultar(`https://viacep.com.br/ws/${cep}/json/`)
  if (dados === NAO_ENCONTRADO || dados?.erro) return NAO_ENCONTRADO
  if (!dados) return null
  return { logradouro: dados.logradouro, bairro: dados.bairro, cidade: dados.localidade, uf: dados.uf }
}

async function brasilApi(cep) {
  const dados = await consultar(`https://brasilapi.com.br/api/cep/v1/${cep}`)
  if (dados === NAO_ENCONTRADO || !dados) return dados
  return { logradouro: dados.street, bairro: dados.neighborhood, cidade: dados.city, uf: dados.state }
}

// Texto aparado; o que não veio fica vazio, para a tela manter o que a Lídia já digitou
const limpar = (endereco) => ({
  logradouro: String(endereco.logradouro ?? '').trim(),
  bairro: String(endereco.bairro ?? '').trim(),
  cidade: String(endereco.cidade ?? '').trim(),
  uf: String(endereco.uf ?? '').trim().toUpperCase(),
})

// Devolve { logradouro, bairro, cidade, uf } do CEP (8 números). CEP desconhecido nas duas APIs
// vira CepNaoEncontradoError; sem resposta de nenhuma, BuscaCepIndisponivelError.
export async function buscarEnderecoPorCep(cep) {
  if (!/^\d{8}$/.test(cep)) throw new CepNaoEncontradoError()

  const primeira = await viaCep(cep)
  if (primeira && primeira !== NAO_ENCONTRADO) return limpar(primeira)

  // A BrasilAPI junta outras fontes: ajuda quando a ViaCEP está fora do ar ou não tem um CEP novo
  const segunda = await brasilApi(cep)
  if (segunda && segunda !== NAO_ENCONTRADO) return limpar(segunda)

  if (primeira === NAO_ENCONTRADO || segunda === NAO_ENCONTRADO) throw new CepNaoEncontradoError()
  throw new BuscaCepIndisponivelError()
}
