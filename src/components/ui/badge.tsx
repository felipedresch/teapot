import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  [
    'inline-flex items-center justify-center rounded-full',
    'px-3 py-0.5 text-xs font-medium border',
    'transition-colors [&>svg]:size-3 [&>svg]:pointer-events-none gap-1',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-primary/15 text-espresso border-primary/20',
        secondary:
          'bg-secondary/40 text-secondary-foreground border-secondary/20',
        outline: 'border-border text-foreground bg-transparent',
        available:
          'bg-gift-available/20 text-espresso border-gift-available/30',
        reserved:
          'bg-gift-reserved/25 text-espresso border-gift-reserved/35',
        received:
          'bg-gift-received/25 text-espresso border-gift-received/35',
        destructive:
          'bg-destructive/15 text-destructive border-destructive/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span'

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
