// Fotos do sistema (logo e capa do estabelecimento, foto do produto): JPG, PNG ou WebP de até
// 5 MB. Uma regra só para todas as telas. O backend valida de novo quando a foto for enviada.

export const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp']
export const TAMANHO_MAX_FOTO = 5 * 1024 * 1024

export function validarFoto(arquivo) {
  if (!TIPOS_FOTO.includes(arquivo.type)) return 'Use uma foto em JPG, PNG ou WebP.'
  if (arquivo.size > TAMANHO_MAX_FOTO) return 'A foto passa de 5 MB. Escolha uma menor.'
  return null
}
