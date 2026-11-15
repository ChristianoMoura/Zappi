import { screen } from '@testing-library/react'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

// Escolhe a data ('AAAA-MM-DD') no calendário do Zappi (CampoData): abre o campo pelo rótulo,
// avança os meses até o dia aparecer e clica nele
export async function escolherData(usuario, rotulo, data) {
  const [ano, mes, dia] = data.split('-').map(Number)
  const nome = `${dia} de ${MESES[mes - 1]} de ${ano}`
  await usuario.click(screen.getByRole('button', { name: rotulo }))
  for (let i = 0; i < 24 && !screen.queryByRole('button', { name: nome }); i++) {
    await usuario.click(await screen.findByRole('button', { name: 'Próximo mês' }))
  }
  await usuario.click(screen.getByRole('button', { name: nome }))
}
