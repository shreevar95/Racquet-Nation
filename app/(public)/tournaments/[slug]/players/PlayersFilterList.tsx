'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { RnCard } from '@/components/rn/RnCard'
import { RnTeamTile } from '@/components/rn/RnTeamTile'

export interface PlayerRow {
  id: string
  slug: string
  name: string
  avatarUrl: string | null
  teamName: string | null
}

export function PlayersFilterList({ players }: { players: PlayerRow[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return players
    return players.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.teamName?.toLowerCase().includes(q) ?? false),
    )
  }, [players, query])

  return (
    <div>
      <div className="relative mb-4">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-rn-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search players or teams…"
          className="w-full rounded-xl border border-rn-border bg-rn-card py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-rn-text-muted focus:border-saffron focus:outline-none focus:ring-2 focus:ring-saffron/20"
        />
      </div>

      {filtered.length === 0 ? (
        <RnCard className="border-dashed p-8 text-center">
          <p className="text-sm text-rn-text-muted">No players match &ldquo;{query}&rdquo;.</p>
        </RnCard>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link key={p.id} href={`/players/${p.slug}`}>
              <RnCard className="rn-card-hover flex items-center gap-2.5 p-2.5">
                <RnTeamTile name={p.name} logoUrl={p.avatarUrl} color="#19A463" size="sm" className="rounded-full" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{p.name}</p>
                  {p.teamName && (
                    <span className="text-xs font-extrabold text-saffron">{p.teamName}</span>
                  )}
                </div>
              </RnCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
