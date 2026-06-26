import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { canEnterScores } from '@/lib/permissions'
import { RnCard } from '@/components/rn/RnCard'
import { rnButtonVariants } from '@/components/rn/RnButton'
import { formatDate, formatTime, formatScore } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Swords, ArrowLeft } from 'lucide-react'

interface Props {
  params: Promise<{ tournamentSlug: string }>
}

export const metadata: Metadata = { title: 'Scoring' }

export default async function ScoringPage({ params }: Props) {
  const { tournamentSlug } = await params
  const user = await requireAuth()

  const tournament = await prisma.tournament.findUnique({
    where: { slug: tournamentSlug },
    select: { id: true, name: true, slug: true },
  })
  if (!tournament) notFound()
  if (!(await canEnterScores(user.id, tournament.id))) notFound()

  const matches = await prisma.match.findMany({
    where: { tournamentId: tournament.id },
    include: {
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
    },
    orderBy: [{ scheduledAt: 'asc' }, { matchNumber: 'asc' }],
  })

  const active = matches.filter((m) => ['LOCKED', 'IN_PROGRESS', 'TIEBREAK_REQUIRED'].includes(m.status))
  const upcoming = matches.filter((m) => ['UPCOMING', 'OPEN_FOR_SUBMISSION'].includes(m.status))
  const completed = matches.filter((m) => m.status === 'COMPLETED')

  return (
    <div className="space-y-8 pt-6">
      <div>
        <Link
          href={`/manage/${tournamentSlug}`}
          className="mb-2 inline-flex items-center gap-1 text-xs text-rn-text-muted transition-colors hover:text-saffron"
        >
          <ArrowLeft size={12} />
          Back to overview
        </Link>
        <h1 className="font-nunito text-xl font-black text-ink">Scoring</h1>
        <p className="text-sm text-rn-text-secondary">{tournament.name}</p>
      </div>

      {active.length > 0 && (
        <Section title="Ready to Score" highlight>
          {active.map((match) => (
            <MatchRow key={match.id} match={match} tournamentSlug={tournamentSlug} />
          ))}
        </Section>
      )}

      {upcoming.length > 0 && (
        <Section title="Upcoming">
          {upcoming.map((match) => (
            <MatchRow key={match.id} match={match} tournamentSlug={tournamentSlug} />
          ))}
        </Section>
      )}

      {completed.length > 0 && (
        <Section title="Completed">
          {completed.map((match) => (
            <MatchRow key={match.id} match={match} tournamentSlug={tournamentSlug} completed />
          ))}
        </Section>
      )}

      {matches.length === 0 && (
        <RnCard className="border-dashed p-8 text-center">
          <p className="text-sm text-rn-text-muted">No matches scheduled yet.</p>
        </RnCard>
      )}
    </div>
  )
}

function Section({
  title,
  children,
  highlight,
}: {
  title: string
  children: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div className="space-y-2">
      <p
        className={cn(
          'text-xs font-extrabold uppercase tracking-wider',
          highlight ? 'text-saffron' : 'text-rn-text-muted',
        )}
      >
        {title}
      </p>
      {children}
    </div>
  )
}

type MatchType = Awaited<ReturnType<typeof prisma.match.findMany>>[number] & {
  homeTeam: { name: string }
  awayTeam: { name: string }
}

const STATUS_STYLE: Record<string, string> = {
  UPCOMING: 'bg-rn-text-muted/10 text-rn-text-muted',
  OPEN_FOR_SUBMISSION: 'bg-rn-blue/10 text-rn-blue',
  LOCKED: 'bg-saffron-tint text-saffron',
  IN_PROGRESS: 'bg-saffron-tint text-saffron',
  TIEBREAK_REQUIRED: 'bg-rn-yellow/20 text-ink',
  COMPLETED: 'bg-rn-green/10 text-rn-green',
}

function MatchRow({
  match,
  tournamentSlug,
  completed,
}: {
  match: MatchType
  tournamentSlug: string
  completed?: boolean
}) {
  return (
    <RnCard className="flex items-center justify-between gap-3 p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">
          {match.homeTeam.name} vs {match.awayTeam.name}
        </p>
        {match.scheduledAt ? (
          <p className="text-xs text-rn-text-muted">
            {formatDate(match.scheduledAt)} {formatTime(match.scheduledAt)}
          </p>
        ) : (
          <p className="text-xs text-rn-text-muted">No time set</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {completed && match.homeTeamScore !== null && match.awayTeamScore !== null && (
          <span className="font-nunito text-sm font-black text-ink">
            {formatScore(match.homeTeamScore, match.awayTeamScore)}
          </span>
        )}
        <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide', STATUS_STYLE[match.status] ?? 'bg-rn-text-muted/10 text-rn-text-muted')}>
          {match.status.replace(/_/g, ' ')}
        </span>
        <Link
          href={`/manage/${tournamentSlug}/scoring/${match.id}`}
          className={cn(
            rnButtonVariants({
              variant: completed || match.status !== 'LOCKED' ? 'secondary' : 'primary',
              size: 'sm',
            }),
            'h-9 w-9 p-0',
          )}
        >
          <Swords size={14} />
        </Link>
      </div>
    </RnCard>
  )
}
