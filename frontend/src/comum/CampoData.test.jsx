import { MantineProvider } from '@mantine/core'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { tema } from '../tema'
import { CampoData } from './CampoData'

function Campo({ aoMudar, inicial = '' }) {
  const [data, setData] = useState(inicial)
  return (
    <CampoData
      label="Data"
      minDate="2026-11-22"
      value={data}
      onChange={(nova) => {
        setData(nova)
        aoMudar(nova)
      }}
    />
  )
}

const abrir = (props) =>
  render(
    <MantineProvider theme={tema} env="test">
      <Campo {...props} />
    </MantineProvider>,
  )

describe('CampoData: calendário do Zappi', () => {
  test('abre no mês da data mínima, em português, com os dias anteriores bloqueados', async () => {
    const usuario = userEvent.setup()
    abrir({ aoMudar: vi.fn(), inicial: '' })

    expect(screen.getByRole('button', { name: 'Data' })).toHaveTextContent('Escolha a data')
    await usuario.click(screen.getByRole('button', { name: 'Data' }))

    expect(screen.getByText('novembro 2026')).toBeVisible()
    expect(screen.getByRole('button', { name: '21 de novembro de 2026' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '22 de novembro de 2026' })).toBeEnabled()
  })

  test('devolve a data escolhida como AAAA-MM-DD e mostra no campo', async () => {
    const usuario = userEvent.setup()
    const aoMudar = vi.fn()
    abrir({ aoMudar })

    await usuario.click(screen.getByRole('button', { name: 'Data' }))
    await usuario.click(screen.getByRole('button', { name: '28 de novembro de 2026' }))

    expect(aoMudar).toHaveBeenCalledWith('2026-11-28')
    expect(screen.getByRole('button', { name: 'Data' })).toHaveTextContent('sáb, 28/11/2026')
  })
})
