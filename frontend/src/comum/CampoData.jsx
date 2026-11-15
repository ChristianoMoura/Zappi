import 'dayjs/locale/pt-br'
import { DatePickerInput } from '@mantine/dates'
import { IconCalendarEvent } from '@tabler/icons-react'
import dayjs from 'dayjs'
import classes from './CampoData.module.css'

// Campo de data com o calendário do Zappi, no lugar do calendário do navegador. Recebe e devolve
// a data como 'AAAA-MM-DD' (texto vazio sem data); os dias antes de minDate ficam bloqueados
export function CampoData({ value, onChange, minDate, placeholder = 'Escolha a data', classNames = {}, ...resto }) {
  return (
    <DatePickerInput
      locale="pt-br"
      firstDayOfWeek={0}
      valueFormat="ddd, DD/MM/YYYY"
      value={value || null}
      onChange={(data) => onChange(data ?? '')}
      minDate={minDate || undefined}
      // Abre no mês da data escolhida ou, sem ela, no da primeira data permitida
      defaultDate={value || minDate || undefined}
      placeholder={placeholder}
      rightSection={<IconCalendarEvent size={20} aria-hidden />}
      rightSectionPointerEvents="none"
      previousLabel="Mês anterior"
      nextLabel="Próximo mês"
      getDayAriaLabel={(data) => dayjs(data).locale('pt-br').format('D [de] MMMM [de] YYYY')}
      popoverProps={{ position: 'bottom-start', shadow: 'md', radius: 'lg' }}
      classNames={{
        ...classNames,
        section: classes.icone,
        calendarHeaderLevel: classes.mes,
        calendarHeaderControl: classes.seta,
        weekday: classes.semana,
        day: classes.dia,
      }}
      {...resto}
    />
  )
}
