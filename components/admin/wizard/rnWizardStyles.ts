export const rnFieldClassName =
  'h-10 w-full rounded-md border border-rn-border bg-rn-card px-3 text-sm text-ink placeholder:text-rn-text-muted focus:border-saffron focus:outline-none focus:ring-2 focus:ring-saffron/20 disabled:opacity-50'

export const rnLabelClassName = 'text-sm font-bold text-rn-text-secondary'

export function rnOptionCardClassName(selected: boolean): string {
  return [
    'flex items-start gap-3 rounded-lg border p-3 text-left transition-all',
    selected ? 'border-saffron bg-saffron-tint' : 'border-rn-border bg-rn-card hover:border-saffron/50',
  ].join(' ')
}

export function rnPresetButtonClassName(selected: boolean): string {
  return [
    'flex-1 rounded-md border py-2 text-sm font-bold transition-all',
    selected ? 'border-saffron bg-saffron-tint text-saffron' : 'border-rn-border bg-rn-card text-rn-text-secondary hover:border-saffron/50',
  ].join(' ')
}
