import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-40 select-none active:scale-[0.97]',
  {
    variants: {
      variant: {
        default:
          'bg-brand-500 text-white hover:bg-brand-600 shadow-sm',
        secondary:
          'bg-surface-raised text-text-primary border border-border hover:bg-surface-overlay',
        ghost:
          'text-text-secondary hover:text-text-primary hover:bg-surface-raised',
        destructive:
          'bg-error text-white hover:bg-red-600',
        outline:
          'border border-border bg-transparent text-text-primary hover:bg-surface-raised',
        link:
          'text-brand-400 underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm:   'h-8  px-3   text-xs',
        md:   'h-10 px-4   text-sm',
        lg:   'h-12 px-6   text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        )}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
