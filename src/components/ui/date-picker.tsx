import { useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Calendar } from './calendar'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

type DatePickerProps = {
  label: string
  value: string
  onChange: (value: string) => void
}

export function DatePicker({ label, value, onChange }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selectedDate = parseDateFromIso(value)

  const handleSelect = (date: Date | undefined) => {
    onChange(date ? toIsoDate(date) : '')
    setOpen(false)
  }

  return (
    <div className="space-y-1.5">
      <p className="block text-sm font-medium text-espresso/80 pl-0.5">{label}</p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className={cn(
              'w-full justify-start px-4 text-left text-base font-normal',
              selectedDate ? 'text-espresso' : 'text-warm-gray/50',
            )}
          >
            <CalendarIcon className="size-4 text-warm-gray/70" />
            {selectedDate ? formatDate(selectedDate) : 'Selecionar data'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
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
  return new Intl.DateTimeFormat('pt-BR').format(value)
}
