import { IconEgg, IconGrain, IconInfoCircle, IconMilk, IconNut, IconSeedling, IconWheat } from '@tabler/icons-react'
import { ALERGENOS } from './regrasProdutos'
import classes from './SelosAlergenos.module.css'

// O Tabler não tem amendoim: duas metades da casca, com um ponto em cada
function IconeAmendoim({ size = 24, ...resto }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...resto}>
      <path d="M12 3a4.5 4.5 0 0 0 -2.6 8.2a4.5 4.5 0 1 0 5.2 0a4.5 4.5 0 0 0 -2.6 -8.2z" />
      <path d="M10.5 7h.01" />
      <path d="M13.5 15h.01" />
    </svg>
  )
}

const ICONES = {
  GLUTEN: IconWheat,
  LEITE: IconMilk,
  OVOS: IconEgg,
  SOJA: IconSeedling,
  AMENDOIM: IconeAmendoim,
  CASTANHAS: IconNut,
  GERGELIM: IconGrain,
}

export function IconeAlergeno({ codigo, size = 22 }) {
  const Icone = ICONES[codigo] ?? IconInfoCircle
  return <Icone size={size} aria-hidden />
}

// Selos dos alérgenos do produto (ZAP-128): ícone e nome, um por alérgeno marcado, e um com o
// texto livre. O nome vem sempre escrito, para não depender só do ícone (NBR 17225 5.11.2).
export function SelosAlergenos({ alergenos = [], outros = '', className }) {
  const marcados = ALERGENOS.filter((a) => alergenos.includes(a.codigo))
  const texto = (outros ?? '').trim()
  if (marcados.length === 0 && !texto) return null
  return (
    <ul className={`${classes.selos} ${className ?? ''}`} aria-label="Alérgenos">
      {marcados.map((a) => (
        <li key={a.codigo} className={classes.selo}>
          <IconeAlergeno codigo={a.codigo} size={18} />
          {a.selo}
        </li>
      ))}
      {texto && (
        <li className={classes.selo}>
          <IconInfoCircle size={18} aria-hidden />
          {texto}
        </li>
      )}
    </ul>
  )
}
