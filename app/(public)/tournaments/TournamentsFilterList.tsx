'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatDateRange } from '@/lib/utils'
import { RnCard } from '@/components/rn/RnCard'
import { cn } from '@/lib/utils'

export interface TournamentRow {
  id: string
  slug: string
  name: string
  venue: string
  startDate: Date
  endDate: Date
  status: string
  maxPlayers: number
  sport: { name: string }
  _count: { teams: number; registrations: number }
}

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-rn-text-muted/10 text-rn-text-muted',
  REGISTRATION_OPEN: 'bg-rn-green text-white',
  REGISTRATION_CLOSED: 'bg-red-down/10 text-red-down',
  ACTIVE: 'bg-saffron-tint text-saffron',
  COMPLETED: 'bg-rn-green/10 text-rn-green',
  ARCHIVED: 'bg-rn-text-muted/10 text-rn-text-muted',
}

function spotsTier(filled: number, max: number) {
  if (max <= 0) return { text: 'text-rn-text-muted', bar: 'bg-rn-green', full: false }
  if (filled >= max) return { text: 'text-red-down', bar: 'bg-red-down', full: true }
  if (filled / max > 0.9) return { text: 'text-saffron', bar: 'bg-saffron', full: false }
  return { text: 'text-rn-green', bar: 'bg-rn-green', full: false }
}

const CANONICAL_SPORT_ORDER = ['Pickleball', 'Tennis', 'Badminton', 'Squash', 'Table Tennis', 'Padel']

function TournamentCard({ t }: { t: TournamentRow }) {
  return (
    <Link href={`/tournaments/${t.slug}`} className="block">
      <RnCard className="rn-card-hover p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="truncate font-nunito text-lg font-extrabold uppercase tracking-tight text-ink">
              {t.name}
            </p>
            <p className="text-xs text-rn-text-secondary">
              {t.venue} · {formatDateRange(t.startDate, t.endDate)}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-rn-border bg-paper px-2 py-0.5 text-[10px] font-bold text-rn-text-secondary">
                {t.sport.name}
              </span>
              <span className="rounded-full border border-rn-border bg-paper px-2 py-0.5 text-[10px] font-bold text-rn-text-secondary">
                {t._count.teams} teams
              </span>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${STATUS_STYLE[t.status] ?? 'bg-rn-text-muted/10 text-rn-text-muted'}`}
          >
            {t.status.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Spots progress bar */}
        {(t.status === 'REGISTRATION_OPEN' || t.status === 'REGISTRATION_CLOSED') && t.maxPlayers > 0 && (() => {
          const tier = spotsTier(t._count.registrations, t.maxPlayers)
          return (
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-rn-text-muted">
                  <span className={cn('font-extrabold', tier.text)}>{t._count.registrations}</span>
                  {' / '}
                  <span className={cn('font-extrabold', tier.text)}>{t.maxPlayers}</span>
                  {' spots filled'}
                </span>
                {tier.full && (
                  <span className="font-extrabold text-red-down">Full — waitlist open</span>
                )}
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', tier.bar)}
                  style={{ width: `${Math.min(100, (t._count.registrations / t.maxPlayers) * 100)}%` }}
                />
              </div>
            </div>
          )
        })()}
      </RnCard>
    </Link>
  )
}

export function TournamentsFilterList({ tournaments }: { tournaments: TournamentRow[] }) {
  const [selectedSport, setSelectedSport] = useState<string>('All')

  const sportOptions = useMemo(() => {
    const present = Array.from(new Set(tournaments.map((t) => t.sport.name)))
    const ordered = CANONICAL_SPORT_ORDER.filter((s) => present.includes(s))
    const extra = present.filter((s) => !CANONICAL_SPORT_ORDER.includes(s)).sort()
    return ['All', ...ordered, ...extra]
  }, [tournaments])

  const filtered = selectedSport === 'All' ? tournaments : tournaments.filter((t) => t.sport.name === selectedSport)

  // (1) Active first, (2) Upcoming chronologically, (3) Completed last.
  // Each bucket preserves the incoming startDate-ascending order from the query.
  const groups = [
    { label: 'Active', items: filtered.filter((t) => t.status === 'ACTIVE') },
    { label: 'Upcoming', items: filtered.filter((t) => t.status !== 'ACTIVE' && t.status !== 'COMPLETED') },
    { label: 'Completed', items: filtered.filter((t) => t.status === 'COMPLETED') },
  ].filter((g) => g.items.length > 0)

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {sportOptions.map((opt) => {
          const active = selectedSport === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setSelectedSport(opt)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-colors',
                active
                  ? 'bg-saffron text-white'
                  : 'border border-rn-border text-rn-text-secondary hover:border-saffron hover:text-saffron',
              )}
            >
              {opt}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <RnCard className="border-dashed p-16 text-center">
          <p className="font-nunito text-xl font-extrabold uppercase text-rn-text-muted">No tournaments yet.</p>
          <p className="mt-2 text-sm text-rn-text-muted">Check back soon.</p>
        </RnCard>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label} className="space-y-3">
              <p className="text-xs font-extrabold uppercase tracking-[.15em] text-rn-text-muted">
                {group.label}
              </p>
              <div className="flex flex-col gap-3">
                {group.items.map((t) => (
                  <TournamentCard key={t.id} t={t} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
