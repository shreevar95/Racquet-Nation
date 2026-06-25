import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface RnStatTileProps {
  value: ReactNode
  label: string
  highlighted?: boolean
  className?: string
}

export function RnStatTile({ value, label, highlighted = false, className }: RnStatTileProps) {
  return (
    <div
      className={cn(
        'flex-1 rounded-rn-card-inner px-3 py-3 text-center',
        highlighted ? 'bg-saffron-tint' : 'border border-rn-border bg-rn-card',
        className,
      )}
    >
      <div className={cn('font-nunito text-xl font-black leading-none', highlighted ? 'text-saffron' : 'text-ink')}>
        {value}
      </div>
      <div
        className={cn(
          'mt-1 text-[9px] font-extrabold tracking-[.1em]',
          highlighted ? 'text-saffron/80' : 'text-rn-text-muted',
        )}
      >
        {label}
      </div>
    </div>
  )
}
