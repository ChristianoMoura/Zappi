import { IconCash, IconCreditCard, IconCreditCardPay, IconToolsKitchen2 } from '@tabler/icons-react'

// Símbolo do Pix desenhado aqui (o Tabler não tem): quatro losangos em volta de um centro vazado
function IconePix({ size = 24, ...resto }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" {...resto}>
      <path d="M12 2.5l4 4l-4 4l-4 -4z" />
      <path d="M17.5 8l4 4l-4 4l-4 -4z" />
      <path d="M12 13.5l4 4l-4 4l-4 -4z" />
      <path d="M6.5 8l4 4l-4 4l-4 -4z" />
    </svg>
  )
}

// Ícone de cada forma de pagamento (ZAP-194), pelos códigos da API (ZAP-192)
const ICONES = { DINHEIRO: IconCash, PIX: IconePix, CREDITO: IconCreditCard, DEBITO: IconCreditCardPay, VR: IconToolsKitchen2 }

export function IconeFormaPagamento({ codigo, size = 24 }) {
  const Icone = ICONES[codigo] ?? IconCreditCard
  return <Icone size={size} aria-hidden />
}
