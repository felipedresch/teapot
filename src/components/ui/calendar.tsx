import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { buttonVariants } from './button'

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-1', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-2',
        month: 'space-y-3',
        caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium',
        nav: 'flex items-center gap-1',
        nav_button: cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'size-7 bg-transparent p-0 opacity-80 hover:opacity-100',
        ),
        nav_button_previous: 'absolute left-0',
        nav_button_next: 'absolute right-0',
        table: 'w-full border-collapse space-y-1',
        head_row: 'grid grid-cols-7',
        head_cell:
          'text-warm-gray rounded-md h-7 w-9 font-normal text-[0.8rem] flex items-center justify-center',
        row: 'grid grid-cols-7 w-full mt-1',
        cell: 'flex items-center justify-center h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-blush/25 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
        day: cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
        ),
        day_selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
        day_today: 'bg-blush/30 text-espresso',
        day_outside: 'text-warm-gray/50 opacity-50',
        day_disabled: 'text-warm-gray/40 opacity-50',
        day_hidden: 'invisible',
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
