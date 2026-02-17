import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { buttonVariants } from './button'

const now = new Date()
const defaultStartMonth = new Date(now.getFullYear() - 2, 0, 1)
const defaultEndMonth = new Date(now.getFullYear() + 5, 11, 31)

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'dropdown',
  startMonth = defaultStartMonth,
  endMonth = defaultEndMonth,
  hideNavigation = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      locale={ptBR}
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      startMonth={startMonth}
      endMonth={endMonth}
      hideNavigation={hideNavigation}
      className={cn('p-1', className)}
      classNames={{
        root: 'w-full',
        months: 'flex flex-col gap-2',
        month: 'space-y-3',
        caption: 'flex justify-center pt-1 relative items-center gap-1',
        // No modo dropdown, a label vira duplicata visual. Aqui removemos do layout.
        caption_label: 'hidden',
        // Garante área clicável e evita sobreposições em iOS dentro do popover.
        dropdowns: 'flex items-center gap-2 flex-wrap justify-center pointer-events-auto',
        dropdown_root: 'inline-flex items-center pointer-events-auto',
        dropdown:
          'pointer-events-auto rounded-md border border-border bg-warm-white px-2 py-1.5 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-ring',
        months_dropdown:
          'pointer-events-auto rounded-md border border-border bg-warm-white px-2 py-1.5 text-sm text-espresso',
        years_dropdown:
          'pointer-events-auto rounded-md border border-border bg-warm-white px-2 py-1.5 text-sm text-espresso',
        nav: 'flex items-center gap-1',
        button_previous: cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'size-7 bg-transparent p-0 opacity-80 hover:opacity-100',
        ),
        button_next: cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'size-7 bg-transparent p-0 opacity-80 hover:opacity-100',
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'grid grid-cols-7',
        weekday:
          'text-warm-gray rounded-md h-8 w-9 font-medium text-[0.8rem] flex items-center justify-center',
        weeks: 'mt-1',
        week: 'grid grid-cols-7 mt-1',
        day: 'h-9 w-9 p-0 text-sm',
        day_button: cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
        ),
        selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
        today: 'bg-blush/30 text-espresso',
        outside: 'text-warm-gray/50 opacity-50',
        disabled: 'text-warm-gray/40 opacity-50',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
