import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatDateRange } from '@/lib/utils'
import { RnPageHeader } from '@/components/rn/RnPageHeader'

interface Props {
  children: React.ReactNode
  params: Promise<{ slug: string }>
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

const TABS = [
  { href: '', label: 'Overview' },
  { href: '/bracket', label: 'Bracket' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/results', label: 'Results' },
  { href: '/standings', label: 'Standings' },
  { href: '/teams', label: 'Teams' },
  { href: '/players', label: 'Players' },
  { href: '/rules', label: 'Rules' },
  { href: '/announcements', label: 'Updates' },
]

export default async function TournamentHubLayout({ children, params }: Props) {
  const { slug } = await params
  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      visibility: true,
      venue: true,
      startDate: true,
      endDate: true,
      logoUrl: true,
      bannerUrl: true,
      primaryColor: true,
      sport: { select: { name: true } },
    },
  })
  if (!tournament) notFound()

  // Fetch ticker data: recent results + qualification news
  const [recentResults, qualifications] = await Promise.all([
    prisma.match.findMany({
      where: { tournamentId: tournament.id, status: 'COMPLETED', homeTeamScore: { not: null } },
      orderBy: { completedAt: 'desc' },
      take: 10,
      select: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
        homeTeamScore: true,
        awayTeamScore: true,
        winnerId: true,
        homeTeamId: true,
      },
    }),
    prisma.standings.findMany({
      where: {
        tournamentId: tournament.id,
        qualificationStatus: { in: ['QUALIFIED', 'ELIMINATED', 'GROUP_LEADER'] },
      },
      select: {
        team: { select: { name: true } },
        qualificationStatus: true,
      },
    }),
  ])

  const tickerItems: string[] = []
  for (const m of recentResults) {
    const winner = m.winnerId === m.homeTeamId ? m.homeTeam.name : m.awayTeam.name
    tickerItems.push(
      `${winner} def. ${m.winnerId === m.homeTeamId ? m.awayTeam.name : m.homeTeam.name}  ${m.homeTeamScore}–${m.awayTeamScore}`,
    )
  }
  for (const s of qualifications) {
    if (s.qualificationStatus === 'QUALIFIED' || s.qualificationStatus === 'GROUP_LEADER') {
      tickerItems.push(`${s.team.name} qualifies`)
    } else if (s.qualificationStatus === 'ELIMINATED') {
      tickerItems.push(`${s.team.name} eliminated`)
    }
  }

  const base = `/tournaments/${slug}`

  return (
    <div className="flex min-h-screen flex-col bg-paper font-nunito text-ink">
      <RnPageHeader backHref="/tournaments">
        <div className="flex items-start gap-3">
          {tournament.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tournament.logoUrl}
              alt={tournament.name}
              className="h-12 w-12 shrink-0 rounded-lg border border-white/15 object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-[.14em] text-white/75">
                {tournament.sport.name}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${STATUS_STYLE[tournament.status] ?? 'bg-white/15 text-white/80'}`}
              >
                {tournament.status.replace(/_/g, ' ')}
              </span>
              {tournament.visibility === 'INVITE_ONLY' && (
                <span className="rounded-full bg-rn-yellow/25 px-2 py-0.5 text-[10px] font-extrabold uppercase text-rn-yellow">
                  🔒 Invite Only
                </span>
              )}
              {tournament.visibility === 'UNLISTED' && (
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold uppercase text-white/80">
                  Unlisted
                </span>
              )}
            </div>
            <h1 className="mt-1 truncate font-nunito text-xl font-black uppercase leading-tight tracking-tight">
              {tournament.name}
            </h1>
            <p className="mt-0.5 truncate text-xs text-white/75">
              {tournament.venue} · {formatDateRange(tournament.startDate, tournament.endDate)}
            </p>
          </div>
        </div>
      </RnPageHeader>

      {/* Ticker */}
      {tickerItems.length > 0 && (
        <div className="overflow-hidden border-b border-rn-border bg-saffron-tint py-1.5">
          <div className="ticker-track flex gap-0 whitespace-nowrap" style={{ width: 'max-content' }}>
            {/* Duplicate for seamless loop */}
            {[...tickerItems, ...tickerItems].map((item, i) => (
              <span key={i} className="inline-flex items-center gap-3 px-6 text-xs font-bold text-saffron">
                <span className="text-[10px] text-saffron/70">◆</span>
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <nav className="scroll-x-tabs border-b border-rn-border bg-rn-card">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={`${base}${tab.href}`}
            className="mx-2 shrink-0 whitespace-nowrap border-b-2 border-transparent px-1 pb-3 pt-3 text-sm font-bold text-rn-text-secondary transition-colors first:ml-0 hover:border-saffron/50 hover:text-saffron"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {/* Content */}
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6">{children}</div>
    </div>
  )
}
