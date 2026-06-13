import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { canManageTournament } from '@/lib/permissions'
import { Badge } from '@/components/ui/badge'
import { formatDateRange } from '@/lib/utils'

interface Props {
  children: React.ReactNode
  params: Promise<{ tournamentSlug: string }>
}

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'brand' | 'warning'> = {
  DRAFT: 'default',
  REGISTRATION_OPEN: 'info',
  REGISTRATION_CLOSED: 'warning',
  ACTIVE: 'brand',
  COMPLETED: 'success',
  ARCHIVED: 'default',
}

const TABS = [
  { href: '', label: 'Overview' },
  { href: '/registrations', label: 'Registrations' },
  { href: '/teams', label: 'Teams' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/lineups', label: 'Lineups' },
  { href: '/scoring', label: 'Scoring' },
]

export default async function ManageTournamentLayout({ children, params }: Props) {
  const { tournamentSlug } = await params
  const user = await requireAuth()

  const tournament = await prisma.tournament.findUnique({
    where: { slug: tournamentSlug },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      venue: true,
      startDate: true,
      endDate: true,
      sport: { select: { name: true } },
    },
  })
  if (!tournament) notFound()
  if (!(await canManageTournament(user.id, tournament.id))) notFound()

  const base = `/manage/${tournamentSlug}`

  return (
    <div className="flex flex-col min-h-screen">
      {/* Manage header */}
      <div className="bg-surface-raised border-b border-border">
        {/* Admin indicator bar */}
        <div className="bg-brand-500/10 border-b border-brand-500/20 px-4 sm:px-6 py-1.5">
          <div className="mx-auto max-w-4xl flex items-center justify-between">
            <p className="text-brand-500 text-xs font-bold tracking-[0.15em] uppercase font-display">
              Tournament Admin
            </p>
            <Link
              href={`/tournaments/${tournamentSlug}`}
              target="_blank"
              className="text-xs text-text-muted hover:text-brand-400 transition-colors"
            >
              Public page ↗
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-5 pb-0">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="space-y-1 min-w-0">
              <h1 className="font-display font-black text-xl sm:text-2xl uppercase text-text-primary leading-tight truncate">
                {tournament.name}
              </h1>
              <p className="text-xs text-text-secondary">
                {tournament.sport.name} · {formatDateRange(tournament.startDate, tournament.endDate)} · {tournament.venue}
              </p>
            </div>
            <Badge variant={STATUS_VARIANT[tournament.status] ?? 'default'} dot className="shrink-0 mt-1">
              {tournament.status.replace(/_/g, ' ')}
            </Badge>
          </div>

          {/* Tabs */}
          <nav className="scroll-x-tabs -mx-4 px-4 border-b border-border/50">
            {TABS.map((tab) => (
              <Link
                key={tab.href}
                href={`${base}${tab.href}`}
                className="shrink-0 pb-3 px-1 mx-2 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap border-b-2 border-transparent hover:border-brand-500/50 first:ml-0"
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 py-6">
        {children}
      </div>
    </div>
  )
}
