import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PushNotificationButton } from '@/components/PushNotificationButton'

export const metadata: Metadata = { title: 'Dashboard' }

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  REGISTRATION_OPEN: 'Open',
  REGISTRATION_CLOSED: 'Closed',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
}

export default async function DashboardPage() {
  const user = await requireAuth()
  const isAdmin = user.platformRole === 'PLATFORM_ADMIN'

  const managedTournaments = isAdmin
    ? await prisma.tournament.findMany({
        where: { createdBy: user.id },
        select: { slug: true, name: true, status: true },
        orderBy: { createdAt: 'desc' },
        take: 8,
      })
    : []

  // Upcoming matches for teams this user is a member of
  const playerProfile = await prisma.playerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  })
  const upcomingMatches = playerProfile
    ? await prisma.match.findMany({
        where: {
          status: { in: ['UPCOMING', 'OPEN_FOR_SUBMISSION', 'LOCKED', 'IN_PROGRESS', 'TIEBREAK_REQUIRED'] },
          OR: [
            { homeTeam: { memberships: { some: { playerId: playerProfile.id } } } },
            { awayTeam: { memberships: { some: { playerId: playerProfile.id } } } },
          ],
        },
        include: {
          homeTeam: { select: { id: true, name: true } },
          awayTeam: { select: { id: true, name: true } },
          tournament: { select: { name: true, slug: true } },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 6,
      })
    : []

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-8">

      {/* Page header */}
      <div className="border-b border-border pb-6">
        <p className="text-brand-500 text-xs font-bold tracking-[0.2em] uppercase font-display mb-1">
          Welcome back
        </p>
        <h1 className="font-display font-black text-4xl sm:text-5xl uppercase text-text-primary leading-tight">
          {user.name.split(' ')[0]}
        </h1>
        <div className="flex items-center justify-between mt-2">
          <p className="text-text-secondary text-sm">
            Your upcoming matches and tournament activity.
          </p>
          <PushNotificationButton />
        </div>
      </div>

      {/* Admin section */}
      {isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-4 bg-brand-500" />
            <p className="text-brand-500 text-xs font-bold tracking-[0.2em] uppercase font-display">
              Tournament Admin
            </p>
          </div>

          <Link
            href="/admin/tournaments/new"
            className="flex items-center justify-center gap-2 w-full rounded-lg bg-brand-500 hover:bg-brand-600 text-text-primary py-4 font-display font-bold text-base uppercase tracking-wide transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            Create Tournament
          </Link>

          {managedTournaments.length > 0 && (
            <div className="rounded-lg border border-border bg-surface-raised overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-surface-overlay">
                <p className="text-xs font-display font-bold uppercase tracking-wider text-text-muted">
                  Your Tournaments
                </p>
              </div>
              <div className="divide-y divide-border">
                {managedTournaments.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/manage/${t.slug}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-surface-overlay transition-colors group"
                  >
                    <span className="text-sm font-semibold text-text-primary group-hover:text-brand-400 transition-colors truncate">
                      {t.name}
                    </span>
                    <span className={[
                      'text-xs font-bold uppercase shrink-0 ml-3',
                      t.status === 'ACTIVE' ? 'text-brand-500' :
                      t.status === 'REGISTRATION_OPEN' ? 'text-info' :
                      t.status === 'COMPLETED' ? 'text-success' :
                      'text-text-muted',
                    ].join(' ')}>
                      {STATUS_LABEL[t.status] ?? t.status}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upcoming matches */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-4 bg-brand-500" />
          <p className="text-brand-500 text-xs font-bold tracking-[0.2em] uppercase font-display">
            My Matches
          </p>
        </div>

        {upcomingMatches.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center">
            <p className="font-display font-bold text-lg uppercase text-text-muted">No upcoming matches</p>
            <p className="text-text-muted text-sm mt-2">Register for a tournament to get started.</p>
            <Link
              href="/tournaments"
              className="inline-block mt-4 text-brand-500 text-sm font-semibold hover:text-brand-400 transition-colors"
            >
              Browse Tournaments →
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-surface-raised overflow-hidden">
            <div className="divide-y divide-border">
              {upcomingMatches.map((m) => {
                const needsLineup = m.status === 'OPEN_FOR_SUBMISSION' || m.status === 'TIEBREAK_REQUIRED'
                return (
                  <Link
                    key={m.id}
                    href={`/matches/${m.slug}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-surface-overlay transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary group-hover:text-brand-400 transition-colors truncate">
                        {m.homeTeam.name} vs {m.awayTeam.name}
                      </p>
                      <p className="text-xs text-text-muted">{m.tournament.name}</p>
                    </div>
                    <span className={[
                      'text-xs font-bold uppercase shrink-0 ml-3',
                      needsLineup ? 'text-brand-400' :
                      m.status === 'IN_PROGRESS' ? 'text-success' :
                      'text-text-muted',
                    ].join(' ')}>
                      {needsLineup ? 'Submit lineup' : m.status.replace(/_/g, ' ')}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
