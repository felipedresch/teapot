import * as React from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.ComponentProps<'input'> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

function Input({
  className,
  label,
  error,
  icon,
  id,
  type = 'text',
  ...props
}: InputProps) {
  const generatedId = React.useId()
  const inputId = id || generatedId

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-espresso/80 pl-0.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-gray/60 [&_svg]:size-4">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          type={type}
          data-slot="input"
          className={cn(
            'flex w-full rounded-xl border border-border bg-warm-white',
            'px-4 py-3 text-base text-espresso',
            'placeholder:text-warm-gray/50',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive/40 focus:ring-destructive/30',
            icon && 'pl-10',
            className,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
      </div>
      {error && (
        <p
          id={`${inputId}-error`}
          className="text-sm text-destructive pl-0.5"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  )
}

export { Input }
export type { InputProps }
