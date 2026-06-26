'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { RnCard } from '@/components/rn/RnCard'
import { RnTeamTile } from '@/components/rn/RnTeamTile'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

export interface ResultMatch {
  id: string
  slug: string | null
  completedAt: string | null
  groupName: string | null
  homeTeam: { name: string; primaryColor: string | null; logoUrl: string | null }
  awayTeam: { name: string; primaryColor: string | null; logoUrl: string | null }
  homeTeamId: string
  awayTeamId: string
  homeTeamScore: number | null
  awayTeamScore: number | null
  winnerId: string | null
  games: { gameNumber: number; homeScore: number | null; awayScore: number | null }[]
}

export function ResultsFilterList({ matches }: { matches: ResultMatch[] }) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('All')

  const groupOptions = useMemo(() => {
    const present = Array.from(new Set(matches.map((m) => m.groupName).filter((g): g is string => !!g)))
    present.sort((a, b) => a.localeCompare(b))
    return ['All', ...present]
  }, [matches])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return matches.filter((m) => {
      if (group !== 'All' && m.groupName !== group) return false
      if (q && !m.homeTeam.name.toLowerCase().includes(q) && !m.awayTeam.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [matches, query, group])

  return (
    <div>
      {/* Search + filters */}
      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-rn-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search teams…"
            className="w-full rounded-xl border border-rn-border bg-rn-card py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-rn-text-muted focus:border-saffron focus:outline-none focus:ring-2 focus:ring-saffron/20"
          />
        </div>

        {groupOptions.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {groupOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setGroup(opt)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-extrabold transition-colors',
                  group === opt ? 'bg-saffron text-white' : 'border border-rn-border text-rn-text-secondary hover:border-saffron hover:text-saffron',
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <RnCard className="border-dashed p-8 text-center">
          <p className="text-sm text-rn-text-muted">No results match your filters.</p>
        </RnCard>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((match) => (
            <Link key={match.id} href={match.slug ? `/matches/${match.slug}` : '#'}>
              <RnCard className="rn-card-hover h-full p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <RnTeamTile name={match.homeTeam.name} color={match.homeTeam.primaryColor} logoUrl={match.homeTeam.logoUrl} size="sm" />
                      <p className={cn('truncate text-base font-bold', match.winnerId === match.homeTeamId ? 'text-ink' : 'text-rn-text-muted')}>
                        {match.homeTeam.name}
                      </p>
                    </div>
                    <p className={cn('font-nunito text-2xl font-black tabular-nums', match.winnerId === match.homeTeamId ? 'text-rn-green' : 'text-rn-text-muted')}>
                      {match.homeTeamScore ?? '—'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <RnTeamTile name={match.awayTeam.name} color={match.awayTeam.primaryColor} logoUrl={match.awayTeam.logoUrl} size="sm" />
                      <p className={cn('truncate text-base font-bold', match.winnerId === match.awayTeamId ? 'text-ink' : 'text-rn-text-muted')}>
                        {match.awayTeam.name}
                      </p>
                    </div>
                    <p className={cn('font-nunito text-2xl font-black tabular-nums', match.winnerId === match.awayTeamId ? 'text-rn-green' : 'text-rn-text-muted')}>
                      {match.awayTeamScore ?? '—'}
                    </p>
                  </div>
                </div>

                {match.games.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {match.games.map((g) => (
                      <span
                        key={g.gameNumber}
                        className="rounded border border-rn-border bg-paper px-2 py-0.5 text-xs text-rn-text-muted"
                      >
                        G{g.gameNumber}: {g.homeScore}–{g.awayScore}
                      </span>
                    ))}
                  </div>
                )}

                {match.completedAt && (
                  <p className="mt-2 text-xs text-rn-text-muted">{formatDate(match.completedAt)}</p>
                )}
              </RnCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
