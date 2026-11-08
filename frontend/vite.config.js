import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // No contêiner do Docker no Windows, o Vite não percebe as alterações
    // nos arquivos sem polling. O Docker Compose liga isto.
    watch: { usePolling: process.env.VITE_USAR_POLLING === 'true' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/testes/configuracao.js',
    // Os formulários são grandes e os testes digitam campo por campo: 5 s (o padrão) fica no limite
    testTimeout: 20000,
  },
})
