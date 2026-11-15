import { VisuallyHidden } from '@mantine/core'
import { percentualDesconto, textoDescontoCurto } from './regrasProdutos'
import classes from './Produtos.module.css'

// "-13%" em verde, ao lado da unidade (ajuste da promoção de 15/11/2026, no lugar do selo
// vermelho "Promoção · 13% de desconto"). O leitor de tela ouve "13% de desconto", e não
// "menos 13 por cento". Com `lido` falso, quem chama já anuncia o desconto no próprio texto.
export function DescontoCurto({ produto, lido = true }) {
  const texto = textoDescontoCurto(produto)
  if (!texto) return null
  return (
    <>
      <span className={classes.descontoCurto} aria-hidden="true">
        {texto}
      </span>
      {lido && <VisuallyHidden>{`, ${percentualDesconto(produto)}% de desconto`}</VisuallyHidden>}
    </>
  )
}
