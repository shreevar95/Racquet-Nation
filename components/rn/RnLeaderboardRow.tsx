import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { RnTeamTile } from './RnTeamTile'

interface RnLeaderboardRowProps {
  rank: ReactNode
  name: string
  points: ReactNode
  color?: string | null
  logoUrl?: string | null
  highlighted?: boolean
  className?: string
}

export function RnLeaderboardRow({
  rank,
  name,
  points,
  color,
  logoUrl,
  highlighted = false,
  className,
}: RnLeaderboardRowProps) {
  return (
    <div className={cn('flex items-center gap-2.5 rounded-xl px-2.5 py-2', highlighted && 'bg-saffron-tint', className)}>
      <span className="w-[18px] text-sm font-black text-saffron">{rank}</span>
      <RnTeamTile name={name} color={color} logoUrl={logoUrl} size="sm" />
      <span className="flex-1 truncate text-sm font-bold text-ink">{name}</span>
      <span className="font-nunito text-sm font-black text-ink">{points}</span>
    </div>
  )
}
