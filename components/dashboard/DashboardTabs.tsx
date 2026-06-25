'use client'

import { useState } from 'react'
import Link from 'next/link'
import { RnSegmentedTabs } from '@/components/rn/RnSegmentedTabs'
import { RnCard } from '@/components/rn/RnCard'
import { RnTeamTile } from '@/components/rn/RnTeamTile'

export interface DashboardMatch {
  id: string
  slug: string
  homeTeamName: string
  awayTeamName: string
  tournamentName: string
  statusLabel: string
  needsLineup: boolean
  accent: string
}

export interface DashboardTeam {
  id: string
  name: string
  primaryColor: string | null
  logoUrl: string | null
  sub: string
  manageHref: string
}

export function DashboardTabs({ matches, teams }: { matches: DashboardMatch[]; teams: DashboardTeam[] }) {
  const [tab, setTab] = useState<'matches' | 'teams'>('matches')

  return (
    <div>
      <RnSegmentedTabs
        tabs={[
          { key: 'matches', label: 'Matches' },
          { key: 'teams', label: 'Teams' },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div className="mt-3.5 flex flex-col gap-2.5">
        {tab === 'matches' &&
          (matches.length === 0 ? (
            <RnCard className="p-6 text-center text-sm text-rn-text-muted">No other matches scheduled.</RnCard>
          ) : (
            matches.map((m) => (
              <Link key={m.id} href={`/matches/${m.slug}`}>
                <RnCard className="flex items-center gap-3 p-3.5">
                  <span className="h-[38px] w-1.5 rounded shrink-0" style={{ background: m.accent }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-extrabold text-ink">
                      {m.homeTeamName} vs {m.awayTeamName}
                    </div>
                    <div className="truncate text-xs text-rn-text-muted">{m.tournamentName}</div>
                  </div>
                  <span className={`shrink-0 text-[11px] font-extrabold ${m.needsLineup ? 'text-rn-green' : 'text-rn-text-muted'}`}>
                    {m.statusLabel}
                  </span>
                </RnCard>
              </Link>
            ))
          ))}

        {tab === 'teams' &&
          (teams.length === 0 ? (
            <RnCard className="p-6 text-center text-sm text-rn-text-muted">No teams yet.</RnCard>
          ) : (
            teams.map((t) => (
              <Link key={t.id} href={t.manageHref}>
                <RnCard className="flex items-center gap-3 p-3.5">
                  <RnTeamTile name={t.name} color={t.primaryColor} logoUrl={t.logoUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-extrabold text-ink">{t.name}</div>
                    <div className="truncate text-xs text-rn-text-muted">{t.sub}</div>
                  </div>
                  <span className="shrink-0 text-[11px] font-extrabold text-saffron">Manage →</span>
                </RnCard>
              </Link>
            ))
          ))}
      </div>
    </div>
  )
}
