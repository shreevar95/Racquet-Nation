'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { RnCard } from '@/components/rn/RnCard'
import { RnTeamTile } from '@/components/rn/RnTeamTile'
import { formatDate, formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

export interface ScheduleMatch {
  id: string
  slug: string | null
  status: string
  displayStatus: string
  scheduledAt: string | null
  court: string | null
  groupName: string | null
  homeTeam: { id: string; name: string; primaryColor: string | null; logoUrl: string | null }
  awayTeam: { id: string; name: string; primaryColor: string | null; logoUrl: string | null }
  homeTeamScore: number | null
  awayTeamScore: number | null
  winnerId: string | null
  captainTeamId: string | null
}

const STATUS_STYLE: Record<string, string> = {
  UPCOMING: 'bg-rn-blue/10 text-rn-blue',
  OPEN_FOR_SUBMISSION: 'bg-rn-blue/10 text-rn-blue',
  LOCKED: 'bg-saffron-tint text-saffron',
  IN_PROGRESS: 'bg-saffron-tint text-saffron',
  TIEBREAK_REQUIRED: 'bg-rn-yellow/20 text-ink',
  COMPLETED: 'bg-rn-green/10 text-rn-green',
}

export function ScheduleFilterList({ matches }: { matches: ScheduleMatch[] }) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('All')
  const [status, setStatus] = useState('All')

  const groupOptions = useMemo(() => {
    const present = Array.from(new Set(matches.map((m) => m.groupName).filter((g): g is string => !!g)))
    present.sort((a, b) => a.localeCompare(b))
    return ['All', ...present]
  }, [matches])

  const statusOptions = useMemo(() => {
    const present = Array.from(new Set(matches.map((m) => m.displayStatus)))
    return ['All', ...present]
  }, [matches])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return matches.filter((m) => {
      if (group !== 'All' && m.groupName !== group) return false
      if (status !== 'All' && m.displayStatus !== status) return false
      if (q && !m.homeTeam.name.toLowerCase().includes(q) && !m.awayTeam.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [matches, query, group, status])

  const upcomingMatches = filtered.filter((m) => m.status !== 'COMPLETED')
  const completedMatches = filtered.filter((m) => m.status === 'COMPLETED')

  const groupByDate = (list: ScheduleMatch[]) => {
    const byDate: Record<string, ScheduleMatch[]> = {}
    for (const m of list) {
      const key = m.scheduledAt ? formatDate(m.scheduledAt) : 'TBD'
      ;(byDate[key] ??= []).push(m)
    }
    return byDate
  }

  const renderMatchRow = (match: ScheduleMatch) => {
    const isCompleted = match.status === 'COMPLETED'
    return (
      <Link key={match.id} href={match.slug ? `/matches/${match.slug}` : '#'}>
        <RnCard className="rn-card-hover flex items-center gap-3 p-3.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <RnTeamTile name={match.homeTeam.name} color={match.homeTeam.primaryColor} logoUrl={match.homeTeam.logoUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">
                {match.homeTeam.name}
                {isCompleted && match.homeTeamScore !== null && match.awayTeamScore !== null && (
                  <span className={cn('mx-1.5 font-nunito font-black tabular-nums', match.winnerId === match.homeTeam.id ? 'text-rn-green' : 'text-rn-text-muted')}>
                    {match.homeTeamScore}
                  </span>
                )}
                {isCompleted ? '—' : ' vs '}
                {isCompleted && match.homeTeamScore !== null && match.awayTeamScore !== null && (
                  <span className={cn('mx-1.5 font-nunito font-black tabular-nums', match.winnerId === match.awayTeam.id ? 'text-rn-green' : 'text-rn-text-muted')}>
                    {match.awayTeamScore}
                  </span>
                )}
                {match.awayTeam.name}
              </p>
              <p className="mt-0.5 text-xs text-rn-text-muted">
                {match.scheduledAt ? formatTime(match.scheduledAt) : 'Time TBD'}
                {match.court && ` · ${match.court}`}
                {match.groupName && ` · ${match.groupName}`}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide', STATUS_STYLE[match.displayStatus] ?? 'bg-rn-text-muted/10 text-rn-text-muted')}>
              {match.displayStatus.replace(/_/g, ' ')}
            </span>
            {match.captainTeamId && (
              <Link
                href={`/lineup/${match.id}?teamId=${match.captainTeamId}`}
                className="rounded-lg border border-saffron/40 px-2 py-1 text-xs font-extrabold text-saffron transition-colors hover:bg-saffron-tint"
                onClick={(e) => e.stopPropagation()}
              >
                Submit Lineup
              </Link>
            )}
          </div>
        </RnCard>
      </Link>
    )
  }

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

        {statusOptions.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setStatus(opt)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-extrabold transition-colors',
                  status === opt ? 'bg-ink text-white' : 'border border-rn-border text-rn-text-secondary hover:border-ink hover:text-ink',
                )}
              >
                {opt === 'All' ? 'All' : opt.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <RnCard className="border-dashed p-8 text-center">
          <p className="text-sm text-rn-text-muted">No matches match your filters.</p>
        </RnCard>
      ) : (
        <div className="space-y-8">
          {/* Upcoming / in-progress */}
          {upcomingMatches.length > 0 && (
            <div className="space-y-4">
              {Object.entries(groupByDate(upcomingMatches)).map(([date, dayMatches]) => (
                <div key={date} className="space-y-2">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-rn-text-muted">{date}</p>
                  <div className="space-y-2">{dayMatches.map(renderMatchRow)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Completed results */}
          {completedMatches.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-0.5 w-4 bg-rn-green" />
                <p className="text-xs font-extrabold uppercase tracking-[.15em] text-rn-green">
                  Results
                </p>
              </div>
              {Object.entries(groupByDate(completedMatches)).map(([date, dayMatches]) => (
                <div key={date} className="space-y-2">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-rn-text-muted">{date}</p>
                  <div className="space-y-2">{dayMatches.map(renderMatchRow)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
