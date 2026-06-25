import { cn } from '@/lib/utils'

const SIZE = {
  sm: 'h-7 w-7 rounded-lg text-[10px]',
  md: 'h-[34px] w-[34px] rounded-[10px] text-xs',
  lg: 'h-[42px] w-[42px] rounded-[11px] text-sm',
  xl: 'h-[52px] w-[52px] rounded-[13px] text-base',
} as const

interface RnTeamTileProps {
  name: string
  color?: string | null
  logoUrl?: string | null
  size?: keyof typeof SIZE
  className?: string
}

export function RnTeamTile({ name, color, logoUrl, size = 'md', className }: RnTeamTileProps) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      className={cn(SIZE[size], 'flex shrink-0 items-center justify-center overflow-hidden font-black text-white', className)}
      style={{ background: logoUrl ? undefined : color ?? '#13243A' }}
    >
      {logoUrl ? <img src={logoUrl} alt={name} className="h-full w-full object-cover" /> : initials}
    </div>
  )
}
