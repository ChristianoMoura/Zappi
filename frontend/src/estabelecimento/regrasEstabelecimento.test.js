import { describe, expect, test } from 'vitest'
import {
  mascaraCep,
  mascaraTelefone,
  validarEstabelecimento,
  validarFoto,
  whatsappParaGuardar,
  whatsappParaTela,
} from './regrasEstabelecimento'

const valido = {
  nome: 'Casa Belt',
  descricao: '',
  slug: 'casa-belt',
  whatsapp: '11900000000',
  emailContato: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
}

describe('regras do estabelecimento (ZAP-26)', () => {
  test('aceita só os obrigatórios preenchidos', () => {
    expect(validarEstabelecimento(valido)).toEqual({})
  })

  test('pede nome, link e WhatsApp', () => {
    const erros = validarEstabelecimento({ ...valido, nome: ' ', slug: '', whatsapp: '' })
    expect(erros).toEqual({
      nome: 'Digite o nome do estabelecimento.',
      slug: 'Digite o link do cardápio.',
      whatsapp: 'Digite o WhatsApp com DDD.',
    })
  })

  test('link só com minúsculas, números e hífen', () => {
    for (const slug of ['Casa-Belt', 'casa belt', 'casa--belt', '-casa', 'casa_belt']) {
      expect(validarEstabelecimento({ ...valido, slug }).slug).toMatch(/minúsculas/)
    }
    expect(validarEstabelecimento({ ...valido, slug: 'doces-2026' }).slug).toBeUndefined()
  })

  test('confere WhatsApp, e-mail, CEP, estado e tamanho', () => {
    const erros = validarEstabelecimento({ ...valido, whatsapp: '119000', emailContato: 'contato', cep: '0100000', uf: 'XX', bairro: 'a'.repeat(81) })
    expect(erros.whatsapp).toMatch(/DDD e 9 números/)
    expect(erros.emailContato).toBe('E-mail inválido.')
    expect(erros.cep).toMatch(/8 números/)
    expect(erros.uf).toBe('Escolha o estado na lista.')
    expect(erros.bairro).toBe('Use no máximo 80 caracteres.')
  })

  test('WhatsApp é guardado com o 55 e mostrado sem ele', () => {
    expect(whatsappParaGuardar('(11) 90000-0000')).toBe('5511900000000')
    expect(whatsappParaTela('5511900000000')).toBe('11900000000')
    expect(whatsappParaGuardar('')).toBe('')
  })

  test('máscaras de telefone e CEP', () => {
    expect(mascaraTelefone('11900000000')).toBe('(11) 90000-0000')
    expect(mascaraTelefone('1190')).toBe('(11) 90')
    expect(mascaraCep('01000000')).toBe('01000-000')
  })

  test('fotos: só JPG, PNG ou WebP de até 5 MB', () => {
    expect(validarFoto({ type: 'image/png', size: 1000 })).toBeNull()
    expect(validarFoto({ type: 'image/gif', size: 1000 })).toBe('Use uma foto em JPG, PNG ou WebP.')
    expect(validarFoto({ type: 'image/jpeg', size: 5 * 1024 * 1024 + 1 })).toBe('A foto passa de 5 MB. Escolha uma menor.')
  })
})
