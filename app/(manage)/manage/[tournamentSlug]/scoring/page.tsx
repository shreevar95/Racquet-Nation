import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { canEnterScores } from '@/lib/permissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, formatTime, formatScore } from '@/lib/utils'
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
    <div className="space-y-8">
      <div>
        <Link
          href={`/manage/${tournamentSlug}`}
          className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-brand-400 transition-colors mb-2"
        >
          <ArrowLeft size={12} />
          Back to overview
        </Link>
        <h1 className="text-xl font-bold text-text-primary">Scoring</h1>
        <p className="text-sm text-text-secondary">{tournament.name}</p>
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
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-text-muted text-sm">No matches scheduled yet.</p>
        </div>
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
        className={[
          'text-xs font-semibold uppercase tracking-wider',
          highlight ? 'text-brand-400' : 'text-text-muted',
        ].join(' ')}
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

const STATUS_BADGE: Record<string, 'default' | 'info' | 'brand' | 'warning' | 'success'> = {
  UPCOMING: 'default',
  OPEN_FOR_SUBMISSION: 'info',
  LOCKED: 'brand',
  IN_PROGRESS: 'brand',
  TIEBREAK_REQUIRED: 'warning',
  COMPLETED: 'success',
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
    <div className="flex items-center justify-between rounded-lg border border-border bg-surface-raised p-3 gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">
          {match.homeTeam.name} vs {match.awayTeam.name}
        </p>
        {match.scheduledAt ? (
          <p className="text-xs text-text-muted">
            {formatDate(match.scheduledAt)} {formatTime(match.scheduledAt)}
          </p>
        ) : (
          <p className="text-xs text-text-muted">No time set</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {completed && match.homeTeamScore !== null && match.awayTeamScore !== null && (
          <span className="text-sm font-bold text-text-primary">
            {formatScore(match.homeTeamScore, match.awayTeamScore)}
          </span>
        )}
        <Badge variant={STATUS_BADGE[match.status] ?? 'default'}>
          {match.status.replace(/_/g, ' ')}
        </Badge>
        <Link href={`/manage/${tournamentSlug}/scoring/${match.id}`}>
          <Button size="icon-sm" variant={completed ? 'outline' : match.status === 'LOCKED' ? 'default' : 'outline'}>
            <Swords size={14} />
          </Button>
        </Link>
      </div>
    </div>
  )
}
