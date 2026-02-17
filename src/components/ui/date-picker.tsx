import { CalendarIcon } from 'lucide-react'
import { Button } from './button'
import { Calendar } from './calendar'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

type DatePickerProps = {
  label: string
  value: string
  onChange: (value: string) => void
}

export function DatePicker({ label, value, onChange }: DatePickerProps) {
  const selectedDate = parseDateFromIso(value)

  return (
    <div className="space-y-1.5">
      <p className="block text-sm font-medium text-espresso/80 pl-0.5">{label}</p>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start text-left font-normal"
          >
            <CalendarIcon className="size-4 text-warm-gray" />
            {selectedDate ? formatDate(selectedDate) : 'Selecionar data'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => onChange(date ? toIsoDate(date) : '')}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

function parseDateFromIso(value: string) {
  if (!value) return undefined
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function toIsoDate(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(value)
}
