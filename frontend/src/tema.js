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

// Cores da paleta A no lugar dos padrões do Mantine. Dentro do app o fundo é branco com
// ciano (decisão do grupo na ZAP-37); o creme fica na tela de login. Texto cacau (13,43:1),
// texto secundário e placeholder em #5C5048 (7,79:1) e erro em #B42318 (6,57:1), sobre o branco.
export const resolverVariaveis = () => ({
  variables: {},
  light: {
    '--mantine-color-body': '#ffffff',
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
    // O Mantine corta o texto do botão que não cabe ("Voltar para confirma"). Aqui o texto quebra
    // em outra linha e o botão cresce, no celular estreito e com a fonte ampliada (NBR 17225 5.4.3)
    Button: Button.extend({
      defaultProps: { size: 'lg' },
      styles: {
        root: { height: 'auto', minHeight: 'var(--button-height)', paddingBlock: 8 },
        label: { whiteSpace: 'normal', overflow: 'visible', textAlign: 'center', lineHeight: 1.25 },
      },
    }),
    Input: Input.extend({ defaultProps: { size: 'lg' } }),
    NavLink: NavLink.extend({
      styles: { root: { minHeight: 56, borderRadius: 'var(--mantine-radius-md)' } },
    }),
  },
})
