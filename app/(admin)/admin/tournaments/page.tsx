import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { Plus } from 'lucide-react'

export const metadata: Metadata = { title: 'Tournaments' }

const STATUS_VARIANTS: Record<
  string,
  'default' | 'brand' | 'success' | 'warning' | 'error' | 'info'
> = {
  DRAFT: 'default',
  REGISTRATION_OPEN: 'info',
  REGISTRATION_CLOSED: 'warning',
  ACTIVE: 'brand',
  COMPLETED: 'success',
  ARCHIVED: 'default',
}

export default async function AdminTournamentsPage() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      sport: { select: { name: true } },
      _count: { select: { teams: true, registrations: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Tournaments</h1>
        <Link href="/admin/tournaments/new">
          <Button size="sm">
            <Plus size={16} /> New Tournament
          </Button>
        </Link>
      </div>

      {tournaments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-text-muted">No tournaments yet.</p>
          <Link href="/admin/tournaments/new" className="mt-3 inline-block">
            <Button size="sm">Create your first tournament</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {tournaments.map((t) => (
            <Link
              key={t.id}
              href={`/manage/${t.slug}`}
              className="flex items-center justify-between rounded-lg border border-border bg-surface-raised p-4 hover:border-brand-500/40 transition-colors"
            >
              <div className="space-y-1 min-w-0">
                <p className="font-medium text-text-primary truncate">{t.name}</p>
                <p className="text-xs text-text-muted">
                  {t.sport.name} · {formatDate(t.startDate)} – {formatDate(t.endDate)}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <span className="text-xs text-text-muted hidden sm:block">
                  {t._count.registrations} regs · {t._count.teams} teams
                </span>
                <Badge variant={STATUS_VARIANTS[t.status] ?? 'default'}>
                  {t.status.replace('_', ' ')}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
