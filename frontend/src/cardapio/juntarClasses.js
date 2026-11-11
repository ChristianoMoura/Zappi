// Junta nomes de classes CSS, ignorando os vazios: juntar('a', falso && 'b', 'c') → 'a c'
export const juntar = (...nomes) => nomes.filter(Boolean).join(' ')
