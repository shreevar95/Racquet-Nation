import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const rnButtonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-extrabold transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-saffron text-white hover:brightness-105 disabled:bg-[#cdd8dc] disabled:opacity-100',
        secondary: 'border border-rn-border bg-rn-card text-ink hover:bg-saffron-tint disabled:opacity-50',
      },
      size: {
        sm: 'h-9 px-4 text-xs',
        md: 'h-11 px-5 text-sm',
        lg: 'h-[52px] px-6 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface RnButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof rnButtonVariants> {}

const RnButton = React.forwardRef<HTMLButtonElement, RnButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(rnButtonVariants({ variant, size }), className)} {...props} />
  ),
)
RnButton.displayName = 'RnButton'

export { RnButton, rnButtonVariants }
