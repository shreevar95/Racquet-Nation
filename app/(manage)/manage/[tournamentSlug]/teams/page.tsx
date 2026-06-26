import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { canManageTournament, isTeamCaptain } from '@/lib/permissions'
import { RnCard } from '@/components/rn/RnCard'
import { RnTeamTile } from '@/components/rn/RnTeamTile'
import { cn } from '@/lib/utils'
import { CreateTeamForm } from './CreateTeamForm'
import { AssignPlayerForm } from './AssignPlayerForm'
import { RandomiseTeamsButton } from './RandomiseTeamsButton'
import { SetCaptainButton } from './SetCaptainButton'
import { MovePlayerButton } from './MovePlayerButton'
import { EditTeamNameButton } from './EditTeamNameButton'
import { EditTeamAvatarButton } from './EditTeamAvatarButton'
import { DeleteTeamButton } from './DeleteTeamButton'

interface Props {
  params: Promise<{ tournamentSlug: string }>
}

export const metadata: Metadata = { title: 'Teams' }

export default async function TeamsPage({ params }: Props) {
  const { tournamentSlug } = await params
  const user = await requireAuth()

  const tournament = await prisma.tournament.findUnique({
    where: { slug: tournamentSlug },
    include: {
      groups: { orderBy: { order: 'asc' } },
      teams: {
        include: {
          memberships: {
            include: {
              player: { include: { user: { select: { name: true, avatarUrl: true } } } },
            },
            orderBy: { role: 'asc' },
          },
          group: { select: { name: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!tournament) notFound()

  const isAdmin = await canManageTournament(user.id, tournament.id)

  // Find which team (if any) this user captains in this tournament
  const captainedTeam = tournament.teams.find((t) => t.captainId === user.id)
  const isCaptain = !!captainedTeam

  if (!isAdmin && !isCaptain) notFound()

  // Approved players not yet on a team (admin-only data)
  const approvedRegistrations = isAdmin
    ? await prisma.registration.findMany({
        where: {
          tournamentId: tournament.id,
          status: 'APPROVED',
          player: { teamMemberships: { none: { team: { tournamentId: tournament.id } } } },
        },
        include: {
          player: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        },
        orderBy: { createdAt: 'asc' },
      })
    : []

  // Captains only see their own team
  const visibleTeams = isAdmin ? tournament.teams : tournament.teams.filter((t) => t.id === captainedTeam?.id)

  return (
    <div className="space-y-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-nunito text-xl font-black text-ink">Teams</h1>
          <p className="text-sm text-rn-text-secondary">{tournament.name}</p>
        </div>
        <span className="text-xs font-bold text-rn-text-muted">
          {tournament.teams.length} / {tournament.numTeams} teams
        </span>
      </div>

      {/* Auto-assign randomiser — admin only */}
      {isAdmin && (
        <RandomiseTeamsButton
          tournamentId={tournament.id}
          numTeams={tournament.numTeams}
          unassignedCount={approvedRegistrations.length}
          hasTeams={tournament.teams.length > 0}
          snapshot={{
            memberships: tournament.teams.flatMap((t) =>
              t.memberships.map((m) => ({
                teamId: t.id,
                playerId: m.player.id,
                role: m.role as 'PLAYER' | 'CAPTAIN' | 'MANAGER',
              })),
            ),
            captains: tournament.teams.map((t) => ({
              teamId: t.id,
              captainId: t.captainId,
            })),
          }}
        />
      )}

      {/* Create team — admin only */}
      {isAdmin && (
        <CreateTeamForm
          tournamentId={tournament.id}
          groups={tournament.groups}
        />
      )}

      {/* Team list */}
      <div className="space-y-4">
        {visibleTeams.map((team) => {
          const canEditThisTeam = isAdmin || team.id === captainedTeam?.id
          const ratedMembers = team.memberships.filter(m => m.player.selfRating !== null)
          const avgRating = ratedMembers.length > 0
            ? (ratedMembers.reduce((s, m) => s + m.player.selfRating!, 0) / ratedMembers.length).toFixed(1)
            : null
          return (
            <RnCard key={team.id} className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <RnTeamTile name={team.name} color={team.primaryColor} logoUrl={team.logoUrl} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-bold text-ink">{team.name}</p>
                      {canEditThisTeam && (
                        <EditTeamNameButton teamId={team.id} currentName={team.name} />
                      )}
                      {canEditThisTeam && (
                        <EditTeamAvatarButton
                          teamId={team.id}
                          teamName={team.name}
                          currentLogoUrl={team.logoUrl ?? null}
                          currentColor={team.primaryColor ?? null}
                        />
                      )}
                    </div>
                    {team.group && (
                      <p className="text-xs text-rn-text-muted">{team.group.name}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      'text-xs font-bold',
                      team.memberships.length > tournament.playersPerTeam
                        ? 'text-red-down'
                        : team.memberships.length === tournament.playersPerTeam
                          ? 'text-rn-green'
                          : 'text-rn-text-muted',
                    )}
                  >
                    {team.memberships.length} / {tournament.playersPerTeam}
                  </span>
                  {avgRating !== null && (
                    <span className="text-xs font-extrabold text-rn-green">· ★ {avgRating}</span>
                  )}
                  {isAdmin && (
                    <DeleteTeamButton teamId={team.id} teamName={team.name} />
                  )}
                </div>
              </div>

              {/* Roster */}
              <div className="space-y-1">
                {team.memberships.map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <RnTeamTile name={m.player.user.name} logoUrl={m.player.user.avatarUrl} color="#19A463" size="sm" className="rounded-full" />
                    <span className="flex-1 text-sm text-ink">{m.player.user.name}</span>
                    <span className="w-10 shrink-0 text-right text-xs font-extrabold text-rn-green">
                      {m.player.selfRating?.toFixed(1) ?? '—'}
                    </span>
                    {isAdmin && (
                      <MovePlayerButton
                        playerId={m.player.id}
                        fromTeamId={team.id}
                        otherTeams={tournament.teams
                          .filter((t) => t.id !== team.id)
                          .map((t) => ({ id: t.id, name: t.name }))}
                      />
                    )}
                    {isAdmin && (
                      <SetCaptainButton
                        teamId={team.id}
                        playerId={m.player.id}
                        isCaptain={m.role === 'CAPTAIN'}
                      />
                    )}
                  </div>
                ))}
                {team.memberships.length === 0 && (
                  <p className="text-xs text-rn-text-muted">No players assigned yet.</p>
                )}
              </div>

              {/* Assign player to this team — admin only */}
              {isAdmin && approvedRegistrations.length > 0 && (
                <AssignPlayerForm
                  teamId={team.id}
                  approvedPlayers={approvedRegistrations.map((r) => ({
                    playerId: r.player.id,
                    name: r.player.user.name,
                    avatarUrl: r.player.user.avatarUrl,
                  }))}
                />
              )}
            </RnCard>
          )
        })}
      </div>

      {isAdmin && tournament.teams.length === 0 && (
        <RnCard className="border-dashed p-8 text-center">
          <p className="text-sm text-rn-text-muted">
            No teams created yet. Use the form above to create the first team.
          </p>
        </RnCard>
      )}
    </div>
  )
}
