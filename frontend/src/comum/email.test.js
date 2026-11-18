import { describe, expect, test } from 'vitest'
import { emailValido } from './email'

describe('emailValido', () => {
  test('aceita e-mails comuns, com espaço nas pontas ignorado', () => {
    for (const email of ['contato@casabelt.com', 'lidia.belt@gmail.com', 'casa_belt+pedidos@empresa.com.br', 'a@b.co', ' contato@casabelt.com ', 'CONTATO@CASABELT.COM', 'loja@meu-dominio.com.br']) {
      expect(emailValido(email), email).toBe(true)
    }
  })

  test('recusa e-mails com formato errado', () => {
    for (const email of [
      '',
      'contato',
      'contato@',
      '@casabelt.com',
      'contato@casabelt',
      'contato@casabelt.com.',
      'contato@casabelt..com',
      'contato@.casabelt.com',
      'contato@casabelt.c',
      'contato@casabelt.c0m',
      'contato@@casabelt.com',
      'contato@casa belt.com',
      'conta to@casabelt.com',
      '.contato@casabelt.com',
      'contato.@casabelt.com',
      'con..tato@casabelt.com',
      'contato@-casabelt.com',
      'contato@casabelt-.com',
      undefined,
    ]) {
      expect(emailValido(email), String(email)).toBe(false)
    }
  })
})
