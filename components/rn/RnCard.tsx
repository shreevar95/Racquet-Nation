import * as React from 'react'
import { cn } from '@/lib/utils'

const RnCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-rn-card border border-rn-border bg-rn-card', className)} {...props} />
  ),
)
RnCard.displayName = 'RnCard'

export { RnCard }
