import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { formatDateRange } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Tournaments',
  description: 'Browse all Racquet Nation tournaments.',
}
export const revalidate = 60

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'brand' | 'warning'> = {
  DRAFT: 'default',
  REGISTRATION_OPEN: 'info',
  REGISTRATION_CLOSED: 'warning',
  ACTIVE: 'brand',
  COMPLETED: 'success',
  ARCHIVED: 'default',
}

export default async function TournamentsPage() {
  const tournaments = await prisma.tournament.findMany({
    where: { isPublic: true, status: { not: 'ARCHIVED' } },
    select: {
      id: true,
      slug: true,
      name: true,
      venue: true,
      startDate: true,
      endDate: true,
      status: true,
      maxPlayers: true,
      sport: { select: { name: true } },
      _count: {
        select: {
          teams: true,
          registrations: { where: { status: 'APPROVED' } },
        },
      },
    },
    orderBy: { startDate: 'asc' },
  })

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">

      {/* Page header */}
      <div className="border-b border-border pb-6">
        <p className="text-brand-500 text-xs font-bold tracking-[0.2em] uppercase font-display mb-2">
          Racquet Nation
        </p>
        <h1 className="font-display font-black text-4xl sm:text-5xl uppercase text-text-primary leading-tight">
          Tournaments
        </h1>
        <p className="text-text-secondary text-sm mt-2">
          {tournaments.length} tournament{tournaments.length !== 1 ? 's' : ''} available
        </p>
      </div>

      {tournaments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-16 text-center">
          <p className="font-display font-bold text-xl uppercase text-text-muted">No tournaments yet.</p>
          <p className="text-text-muted text-sm mt-2">Check back soon.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tournaments.map((t) => (
            <Link
              key={t.id}
              href={`/tournaments/${t.slug}`}
              className="group block rounded-lg border border-border bg-surface-raised p-5 hover:border-brand-500/50 hover:bg-surface-overlay transition-all duration-200 border-l-[3px] border-l-transparent hover:border-l-brand-500"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <p className="font-display font-bold text-lg uppercase tracking-wide text-text-primary group-hover:text-brand-400 transition-colors truncate">
                      {t.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-text-secondary flex-wrap">
                      <span>{t.venue}</span>
                      <span className="text-text-muted">·</span>
                      <span>{formatDateRange(t.startDate, t.endDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <span className="text-brand-500/80">{t.sport.name}</span>
                      <span>·</span>
                      <span>{t._count.teams} teams</span>
                    </div>
                  </div>
                  <div className="shrink-0 pt-0.5">
                    <Badge variant={STATUS_VARIANT[t.status] ?? 'default'} dot>
                      {t.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>

                {/* Spots progress bar */}
                {(t.status === 'REGISTRATION_OPEN' || t.status === 'REGISTRATION_CLOSED') && t.maxPlayers > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted">
                        {t._count.registrations} / {t.maxPlayers} spots filled
                      </span>
                      {t._count.registrations >= t.maxPlayers && (
                        <span className="text-warning font-semibold">Full — waitlist open</span>
                      )}
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-surface-overlay overflow-hidden">
                      <div
                        className="h-full rounded-full bg-green-400 transition-all duration-500"
                        style={{ width: `${Math.min(100, (t._count.registrations / t.maxPlayers) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
