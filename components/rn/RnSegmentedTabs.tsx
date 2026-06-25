'use client'

import { cn } from '@/lib/utils'

interface RnSegmentedTabsProps<T extends string> {
  tabs: { key: T; label: string }[]
  value: T
  onChange: (key: T) => void
  className?: string
}

export function RnSegmentedTabs<T extends string>({ tabs, value, onChange, className }: RnSegmentedTabsProps<T>) {
  return (
    <div className={cn('flex gap-1.5 rounded-[13px] bg-[#ECE6DB] p-1', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={cn(
            'flex-1 rounded-[10px] px-2 py-2 text-xs transition-colors',
            value === tab.key ? 'bg-white font-extrabold text-ink shadow-sm' : 'font-bold text-rn-text-muted hover:text-ink',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
