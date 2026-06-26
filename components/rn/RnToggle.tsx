'use client'

import { cn } from '@/lib/utils'

interface RnToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
}

export function RnToggle({ checked, onChange, className }: RnToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors',
        checked ? 'bg-saffron' : 'bg-rn-border',
        className,
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked && 'translate-x-5',
        )}
      />
    </button>
  )
}
