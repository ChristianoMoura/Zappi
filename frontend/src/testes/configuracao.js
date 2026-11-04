import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// O jsdom não tem estes recursos do navegador, e o Mantine precisa deles
window.matchMedia = vi.fn((consulta) => ({
  matches: false,
  media: consulta,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))

// O Textarea com altura automática escuta o carregamento das fontes
if (!document.fonts) {
  Object.defineProperty(document, 'fonts', { value: { addEventListener: vi.fn(), removeEventListener: vi.fn() } })
}

window.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})
