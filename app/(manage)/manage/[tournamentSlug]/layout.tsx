import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { canManageTournament, isTournamentCaptain } from '@/lib/permissions'
import { RnPageHeader } from '@/components/rn/RnPageHeader'
import { formatDateRange } from '@/lib/utils'
import { ManageTabs } from './ManageTabs'

interface Props {
  children: React.ReactNode
  params: Promise<{ tournamentSlug: string }>
}

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-white/15 text-white/80',
  REGISTRATION_OPEN: 'bg-rn-green-soft/20 text-rn-green-soft',
  REGISTRATION_CLOSED: 'bg-rn-yellow/25 text-rn-yellow',
  ACTIVE: 'bg-saffron/25 text-saffron-300',
  COMPLETED: 'bg-rn-green-soft/20 text-rn-green-soft',
  CANCELLED: 'bg-rn-yellow/25 text-rn-yellow',
  ARCHIVED: 'bg-white/15 text-white/80',
}

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

  const isAdmin = await canManageTournament(user.id, tournament.id)
  const isCaptain = !isAdmin && (await isTournamentCaptain(user.id, tournament.id))
  if (!isAdmin && !isCaptain) notFound()

  return (
    <div className="flex min-h-screen flex-col bg-paper font-nunito text-ink">
      <RnPageHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate font-nunito text-xl font-black uppercase leading-tight tracking-tight text-white">
              {tournament.name}
            </h1>
            <p className="mt-0.5 truncate text-xs text-white/75">
              {tournament.sport.name} · {formatDateRange(tournament.startDate, tournament.endDate)} · {tournament.venue}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${STATUS_STYLE[tournament.status] ?? 'bg-white/15 text-white/80'}`}
            >
              {tournament.status.replace(/_/g, ' ')}
            </span>
            <Link
              href={`/tournaments/${tournamentSlug}`}
              target="_blank"
              className="text-xs text-white/70 transition-colors hover:text-saffron"
            >
              Public page ↗
            </Link>
          </div>
        </div>
      </RnPageHeader>

      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
        <ManageTabs tournamentSlug={tournamentSlug} isAdmin={isAdmin} />
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 pb-6 sm:px-6">{children}</div>
    </div>
  )
}
