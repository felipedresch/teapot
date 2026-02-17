import * as React from 'react'
import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium',
    'transition-all duration-200 ease-out',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg:not([class*="size-"])]:size-4 [&_svg]:shrink-0 shrink-0',
    'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'bg-primary text-primary-foreground',
          'shadow-dreamy',
          'hover:shadow-dreamy-md hover:brightness-[1.06] hover:-translate-y-px',
          'active:translate-y-0 active:shadow-dreamy',
        ].join(' '),
        secondary: [
          'border border-muted-rose/40 text-espresso bg-transparent',
          'hover:bg-blush/25 hover:border-muted-rose/60',
        ].join(' '),
        ghost: 'text-warm-gray hover:bg-blush/20 hover:text-espresso',
        outline: [
          'border border-border bg-warm-white text-espresso',
          'shadow-dreamy',
          'hover:bg-blush/15 hover:border-muted-rose/30',
        ].join(' '),
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        link: 'text-primary underline-offset-4 hover:underline !p-0 !h-auto',
      },
      size: {
        sm: 'h-9 px-4 text-sm rounded-lg',
        default: 'h-11 px-6 text-sm rounded-xl',
        lg: 'h-12 px-8 text-base rounded-xl',
        icon: 'size-10 rounded-xl',
        'icon-sm':
          'size-8 rounded-lg [&_svg:not([class*="size-"])]:size-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  isLoading = false,
  children,
  disabled,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    isLoading?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </Comp>
  )
}

export { Button, buttonVariants }
