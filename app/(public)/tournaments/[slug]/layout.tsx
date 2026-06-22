import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { formatDateRange } from '@/lib/utils'

interface Props {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'brand' | 'warning'> = {
  DRAFT: 'default',
  REGISTRATION_OPEN: 'success',
  REGISTRATION_CLOSED: 'warning',
  ACTIVE: 'brand',
  COMPLETED: 'success',
  CANCELLED: 'warning',
  ARCHIVED: 'default',
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
    <div className="flex flex-col min-h-screen">
      {/* Hero banner */}
      <div
        className="relative overflow-hidden"
        style={
          tournament.bannerUrl
            ? { backgroundImage: `url(${tournament.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: tournament.primaryColor ? `linear-gradient(135deg, ${tournament.primaryColor}40, #080808)` : 'linear-gradient(135deg, #f9731625, #080808)' }
        }
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-surface" />

        {/* Orange accent bar at top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-brand-500" />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 pt-8 pb-0">
          <div className="flex items-start gap-4">
            {tournament.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tournament.logoUrl}
                alt={tournament.name}
                className="h-16 w-16 rounded-lg object-cover border border-white/10 shrink-0"
              />
            )}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-brand-500/80 text-xs font-bold tracking-[0.15em] uppercase font-display">
                  {tournament.sport.name}
                </span>
                <span className="text-text-muted">·</span>
                <Badge variant={STATUS_VARIANT[tournament.status] ?? 'default'} dot>
                  {tournament.status.replace(/_/g, ' ')}
                </Badge>
                {tournament.visibility === 'INVITE_ONLY' && (
                  <Badge variant="warning">🔒 Invite Only</Badge>
                )}
                {tournament.visibility === 'UNLISTED' && (
                  <Badge variant="default">Unlisted</Badge>
                )}
              </div>
              <h1 className="font-display font-black text-2xl sm:text-3xl uppercase text-text-primary leading-tight">
                {tournament.name}
              </h1>
              <p className="text-sm text-text-secondary">
                {tournament.venue} · {formatDateRange(tournament.startDate, tournament.endDate)}
              </p>
            </div>
          </div>

          {/* Ticker */}
          {tickerItems.length > 0 && (
            <div className="mt-5 -mx-4 overflow-hidden bg-brand-500/10 border-y border-brand-500/20 py-1.5">
              <div className="ticker-track flex gap-0 whitespace-nowrap" style={{ width: 'max-content' }}>
                {/* Duplicate for seamless loop */}
                {[...tickerItems, ...tickerItems].map((item, i) => (
                  <span key={i} className="inline-flex items-center gap-3 text-xs font-medium text-brand-400 px-6">
                    <span className="text-brand-500 text-[10px]">◆</span>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tab navigation */}
          <nav className="scroll-x-tabs mt-0 -mx-4 px-4 border-b border-border/50">
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
