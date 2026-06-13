import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full font-medium transition-colors',
  {
    variants: {
      variant: {
        default:     'bg-surface-overlay text-text-secondary text-xs px-2.5 py-0.5',
        brand:       'bg-brand-500/20 text-brand-400 text-xs px-2.5 py-0.5',
        success:     'bg-success-bg text-success text-xs px-2.5 py-0.5',
        warning:     'bg-warning-bg text-warning text-xs px-2.5 py-0.5',
        error:       'bg-error-bg text-error text-xs px-2.5 py-0.5',
        info:        'bg-info-bg text-info text-xs px-2.5 py-0.5',
        outline:     'border border-border text-text-secondary text-xs px-2.5 py-0.5',
      },
      dot: {
        true:  'pl-2',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      dot: false,
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, dot }), className)} {...props}>
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
      )}
      {children}
    </span>
  )
}

export { Badge, badgeVariants }
