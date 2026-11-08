import { afterEach, describe, expect, test, vi } from 'vitest'

// Enquanto a ZAP-36 não existe, as alterações do Meu estabelecimento ficam no navegador,
// para o topo e o login continuarem iguais a ele depois de recarregar a página.
describe('dados simulados do estabelecimento', () => {
  afterEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  test('guarda o nome e o logo salvos e os usa ao abrir de novo', async () => {
    const primeiro = await import('./servicoEstabelecimento')
    const dados = await primeiro.buscarEstabelecimento()
    await primeiro.salvarEstabelecimento({ ...dados, nome: 'Ateliê Teste', logo: 'data:image/webp;base64,AAAA' })

    vi.resetModules()
    const recarregado = await import('./servicoEstabelecimento')

    expect(await recarregado.buscarMarcaLoja()).toEqual({ nome: 'Ateliê Teste', logo: 'data:image/webp;base64,AAAA' })
  })

  test('sem nada guardado, usa a Casa Belt com o logo padrão', async () => {
    const servico = await import('./servicoEstabelecimento')
    const marca = await servico.buscarMarcaLoja()

    expect(marca.nome).toBe('Casa Belt')
    expect(marca.logo).toBeTruthy()
  })

  test('ignora uma cópia guardada com defeito', async () => {
    localStorage.setItem('zappi.estabelecimento-simulado', '{isto não é json')
    const servico = await import('./servicoEstabelecimento')

    expect((await servico.buscarMarcaLoja()).nome).toBe('Casa Belt')
  })
})
