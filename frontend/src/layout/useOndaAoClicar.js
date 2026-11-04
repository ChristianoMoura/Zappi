import { useEffect } from 'react'

const ALVOS = '.mantine-Button-root, .mantine-NavLink-root, [data-onda]'

// Efeito de clique: um círculo se espalha a partir do ponto clicado nos botões e no menu.
// Não roda para quem pediu "reduzir movimento" no sistema.
export function useOndaAoClicar() {
  useEffect(() => {
    const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)')

    function criarOnda(evento) {
      if (semMovimento.matches) return
      const alvo = evento.target.closest(ALVOS)
      if (!alvo || alvo.disabled || alvo.dataset.disabled === 'true') return

      const caixa = alvo.getBoundingClientRect()
      const tamanho = Math.max(caixa.width, caixa.height) * 2
      const onda = document.createElement('span')
      onda.className = 'zappi-onda'
      onda.style.width = `${tamanho}px`
      onda.style.height = `${tamanho}px`
      onda.style.left = `${evento.clientX - caixa.left - tamanho / 2}px`
      onda.style.top = `${evento.clientY - caixa.top - tamanho / 2}px`
      alvo.append(onda)
      onda.addEventListener('animationend', () => onda.remove())
    }

    document.addEventListener('pointerdown', criarOnda)
    return () => document.removeEventListener('pointerdown', criarOnda)
  }, [])
}
