import { Button, createTheme, Input, NavLink } from '@mantine/core'

// Ciano da marca (paleta A, aprovada na ZAP-34). O tom 6 é o DarkCyan do logo
// (#008B8B): com texto branco dá só 4,15:1, então fica para marca e elementos grandes.
// O tom 7 (#006D6D) é o principal dos botões e links: 6,16:1 com texto branco
// e 5,74:1 sobre o creme do login (NBR 17225 5.11.2, mínimo 4,5:1).
const cianoZappi = [
  '#e6f4f4',
  '#c9e7e7',
  '#9fd3d3',
  '#6dbdbd',
  '#3fa8a8',
  '#1a9898',
  '#008b8b',
  '#006d6d',
  '#005a5a',
  '#004646',
]

// Cores da paleta A no lugar dos padrões do Mantine: fundo creme, texto cacau
// (12,75:1), texto secundário e placeholder em #5C5048 (7,39:1) e erro em #B42318 (6,24:1).
export const resolverVariaveis = () => ({
  variables: {},
  light: {
    '--mantine-color-body': '#fff8f0',
    '--mantine-color-text': '#3d2b1f',
    '--mantine-color-dimmed': '#5c5048',
    '--mantine-color-placeholder': '#5c5048',
    '--mantine-color-error': '#b42318',
  },
  dark: {},
})

export const tema = createTheme({
  primaryColor: 'zappi',
  primaryShade: 7,
  colors: { zappi: cianoZappi },

  fontFamily: 'Lexend, "Segoe UI", system-ui, sans-serif',
  headings: {
    fontFamily: 'Lexend, "Segoe UI", system-ui, sans-serif',
    sizes: {
      h1: { fontSize: '1.75rem' },
      h2: { fontSize: '1.5rem' },
    },
  },

  // Fonte maior que o padrão: a usuária tem 54 anos e usa muito o celular
  fontSizes: {
    xs: '0.875rem',
    sm: '1rem',
    md: '1.125rem',
    lg: '1.25rem',
    xl: '1.5rem',
  },

  // Foco visível só na navegação por teclado; o estilo fica em estilos.css
  focusRing: 'auto',

  components: {
    Button: Button.extend({ defaultProps: { size: 'lg' } }),
    Input: Input.extend({ defaultProps: { size: 'lg' } }),
    NavLink: NavLink.extend({
      styles: { root: { minHeight: 56, borderRadius: 'var(--mantine-radius-md)' } },
    }),
  },
})
