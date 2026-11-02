import { Button, createTheme, Input, NavLink } from '@mantine/core'

// Verde da marca. O tom 7 é o principal: texto branco sobre ele tem contraste
// de 6,55:1, e ele sobre o fundo branco também (NBR 17225 5.11.2, mínimo 4,5:1).
const verdeZappi = [
  '#e8f5ec',
  '#cfe9d7',
  '#a3d4b2',
  '#74bd8a',
  '#4da869',
  '#349454',
  '#257f44',
  '#1b6b38',
  '#155a2f',
  '#0f4724',
]

// Os tons padrão do Mantine para texto secundário (#868e96) e placeholder têm
// contraste abaixo de 4,5:1 no fundo branco. Estes ficam em 8,18:1 e 5,85:1.
export const resolverVariaveis = () => ({
  variables: {},
  light: {
    '--mantine-color-dimmed': '#495057',
    '--mantine-color-placeholder': '#5c6670',
  },
  dark: {},
})

export const tema = createTheme({
  primaryColor: 'zappi',
  primaryShade: 7,
  colors: { zappi: verdeZappi },

  // Fonte maior que o padrão: a usuária tem 54 anos e usa muito o celular
  fontSizes: {
    xs: '0.875rem',
    sm: '1rem',
    md: '1.125rem',
    lg: '1.25rem',
    xl: '1.5rem',
  },
  headings: {
    sizes: {
      h1: { fontSize: '1.75rem' },
      h2: { fontSize: '1.5rem' },
    },
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
