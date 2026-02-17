import * as React from 'react'
import { cn } from '@/lib/utils'

function Card({
  className,
  hoverable = false,
  ...props
}: React.ComponentProps<'div'> & { hoverable?: boolean }) {
  return (
    <div
      data-slot="card"
      className={cn(
        'rounded-2xl bg-warm-white border border-border/50 shadow-dreamy',
        'p-6 md:p-8 transition-all duration-200',
        hoverable &&
          'hover:shadow-dreamy-md hover:-translate-y-0.5 cursor-pointer',
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn('flex flex-col gap-1.5 mb-4', className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3
      data-slot="card-title"
      className={cn('text-xl leading-tight', className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="card-description"
      className={cn('text-sm text-warm-gray leading-relaxed', className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="card-content" className={cn('', className)} {...props} />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex items-center gap-3 mt-5 pt-4 border-t border-border/30',
        className,
      )}
      {...props}
    />
  )
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
