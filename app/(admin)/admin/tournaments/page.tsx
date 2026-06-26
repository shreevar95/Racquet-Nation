import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { RnCard } from '@/components/rn/RnCard'
import { rnButtonVariants } from '@/components/rn/RnButton'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'
import { CancelledTournamentActions } from './CancelledTournamentActions'

export const metadata: Metadata = { title: 'Tournaments' }

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-rn-text-muted/10 text-rn-text-muted',
  REGISTRATION_OPEN: 'bg-rn-green/10 text-rn-green',
  REGISTRATION_CLOSED: 'bg-rn-yellow/20 text-ink',
  ACTIVE: 'bg-saffron-tint text-saffron',
  COMPLETED: 'bg-rn-green/10 text-rn-green',
  ARCHIVED: 'bg-rn-text-muted/10 text-rn-text-muted',
  CANCELLED: 'bg-red-down/10 text-red-down',
}

export default async function AdminTournamentsPage() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      sport: { select: { name: true } },
      _count: { select: { teams: true, registrations: true } },
    },
  })

  const active = tournaments.filter((t) => t.status !== 'CANCELLED')
  const cancelled = tournaments.filter((t) => t.status === 'CANCELLED')

  return (
    <div className="space-y-6 font-nunito text-ink">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-ink">Tournaments</h1>
        <Link href="/admin/tournaments/new" className={cn(rnButtonVariants({ variant: 'primary', size: 'sm' }))}>
          <Plus size={16} /> New Tournament
        </Link>
      </div>

      {tournaments.length === 0 ? (
        <RnCard className="border-dashed p-12 text-center">
          <p className="text-rn-text-muted">No tournaments yet.</p>
          <Link href="/admin/tournaments/new" className={cn(rnButtonVariants({ variant: 'primary', size: 'sm' }), 'mt-3 inline-flex')}>
            Create your first tournament
          </Link>
        </RnCard>
      ) : (
        <>
          {/* Active tournaments */}
          <div className="space-y-2">
            {active.map((t) => (
              <Link key={t.id} href={`/manage/${t.slug}`}>
                <RnCard className="rn-card-hover flex items-center justify-between p-4">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-bold text-ink">{t.name}</p>
                    <p className="text-xs text-rn-text-muted">
                      {t.sport.name} · {formatDate(t.startDate)} – {formatDate(t.endDate)}
                    </p>
                  </div>
                  <div className="ml-3 flex shrink-0 items-center gap-3">
                    <span className="hidden text-xs text-rn-text-muted sm:block">
                      {t._count.registrations} regs · {t._count.teams} teams
                    </span>
                    <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide', STATUS_STYLE[t.status] ?? 'bg-rn-text-muted/10 text-rn-text-muted')}>
                      {t.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </RnCard>
              </Link>
            ))}
          </div>

          {/* Cancelled tournaments */}
          {cancelled.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-extrabold uppercase tracking-wider text-rn-text-muted">
                Cancelled
              </p>
              <div className="space-y-2">
                {cancelled.map((t) => (
                  <RnCard key={t.id} className="flex items-center justify-between p-4 opacity-70">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-bold text-rn-text-secondary">{t.name}</p>
                      <p className="text-xs text-rn-text-muted">
                        {t.sport.name} · {formatDate(t.startDate)} – {formatDate(t.endDate)}
                      </p>
                    </div>
                    <div className="ml-3 flex shrink-0 items-center gap-3">
                      <CancelledTournamentActions
                        tournamentId={t.id}
                        tournamentName={t.name}
                      />
                      <span className="rounded-full bg-red-down/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-red-down">
                        Cancelled
                      </span>
                    </div>
                  </RnCard>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
