import { useId } from 'react'

// Ícones das formas de pagamento (ZAP-193), na cor do sistema: usam `currentColor`, e quem mostra
// escolhe a cor (DarkCyan #008B8B, a cor dos ícones no guia de identidade visual). O Pix e o VR
// seguem o desenho das marcas, redesenhados na paleta; dinheiro e cartões foram feitos para o
// Zappi. São decorativos: o nome da forma está sempre escrito ao lado (NBR 17225 5.11.2).
const DESENHOS = {
  DINHEIRO: () => (
    <>
      <rect x="1.5" y="5.5" width="21" height="13" rx="2.5" fill="currentColor" />
      <circle cx="12" cy="12" r="3.7" fill="#fff" />
      <path
        d="M13.3 10.7C13 10.1 12.5 9.9 12 9.9C11.2 9.9 10.7 10.3 10.7 10.9C10.7 12.2 13.3 11.8 13.3 13.1C13.3 13.7 12.8 14.1 12 14.1C11.4 14.1 10.9 13.9 10.6 13.3M12 9.1V9.9M12 14.1V14.9"
        stroke="currentColor"
        strokeWidth=".9"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="5.6" cy="12" r="1.1" fill="#fff" />
      <circle cx="18.4" cy="12" r="1.1" fill="#fff" />
    </>
  ),
  // Losango arredondado com o "X" vazado, como o símbolo do Pix
  PIX: ({ id }) => (
    <>
      <defs>
        <mask id={id}>
          <rect width="24" height="24" fill="#fff" />
          <path
            d="M0 7.6H8.1L10.8 10.3Q12 11.5 13.2 10.3L15.9 7.6H24M0 16.4H8.1L10.8 13.7Q12 12.5 13.2 13.7L15.9 16.4H24"
            stroke="#000"
            strokeWidth="1.5"
            fill="none"
            strokeLinejoin="round"
          />
        </mask>
      </defs>
      <g mask={`url(#${id})`}>
        <rect x="5.28" y="5.28" width="13.44" height="13.44" rx="3.2" transform="rotate(45 12 12)" fill="currentColor" />
      </g>
    </>
  ),
  // Cartão de crédito: com o chip
  CREDITO: () => (
    <>
      <rect x="1.5" y="4.5" width="21" height="15" rx="2.5" fill="currentColor" />
      <rect x="4.5" y="8" width="4.6" height="3.6" rx=".9" fill="#fff" />
      <path d="M4.5 15.5h3M10 15.5h3M15.5 15.5h4" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  // Cartão de débito: com a tarja, para não ficar igual ao de crédito
  DEBITO: () => (
    <>
      <rect x="1.5" y="4.5" width="21" height="15" rx="2.5" fill="currentColor" />
      <rect x="1.5" y="7.6" width="21" height="2.8" fill="#fff" />
      <path d="M4.5 15.2h6" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="15" y="13.6" width="4.5" height="3.2" rx=".8" fill="#fff" />
    </>
  ),
  // Selo quadrado com o canto de cima arredondado e as letras VR vazadas
  VR: () => (
    <>
      <path d="M4.5 2.5H16A5.5 5.5 0 0 1 21.5 8V19.5A2 2 0 0 1 19.5 21.5H2.5V4.5A2 2 0 0 1 4.5 2.5Z" fill="currentColor" />
      <path d="M4.2 8H6.7L8.4 13.4L10.1 8H12.6L9.7 16.4H7.1Z" fill="#fff" />
      <path fillRule="evenodd" d="M12.4 8H16.2A2.75 2.75 0 0 1 17.3 13.3L19.1 16.4H16.5L15.1 13.6H14.6V16.4H12.4ZM14.6 9.8V11.8H15.9A1 1 0 0 0 15.9 9.8Z" fill="#fff" />
    </>
  ),
}

export function IconeFormaPagamento({ codigo, tamanho = 28, className }) {
  // Cada Pix na tela precisa de uma máscara com nome próprio
  const id = `pix-${useId().replace(/:/g, '')}`
  const Desenho = DESENHOS[codigo]
  if (!Desenho) return null
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <Desenho id={id} />
    </svg>
  )
}
