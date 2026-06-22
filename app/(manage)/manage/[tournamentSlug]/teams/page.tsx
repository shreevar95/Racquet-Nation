import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { canManageTournament, isTeamCaptain } from '@/lib/permissions'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { CreateTeamForm } from './CreateTeamForm'
import { AssignPlayerForm } from './AssignPlayerForm'
import { RandomiseTeamsButton } from './RandomiseTeamsButton'
import { SetCaptainButton } from './SetCaptainButton'
import { MovePlayerButton } from './MovePlayerButton'
import { EditTeamNameButton } from './EditTeamNameButton'
import { EditTeamAvatarButton } from './EditTeamAvatarButton'
import { TeamAvatar } from '@/components/ui/team-avatar'
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Teams</h1>
          <p className="text-sm text-text-secondary">{tournament.name}</p>
        </div>
        <span className="text-xs text-text-muted">
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
            <div key={team.id} className="rounded-lg border border-border bg-surface-raised p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <TeamAvatar name={team.name} logoUrl={team.logoUrl} primaryColor={team.primaryColor} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-text-primary truncate">{team.name}</p>
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
                      <p className="text-xs text-text-muted">{team.group.name}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium ${team.memberships.length > tournament.playersPerTeam ? 'text-red-400' : team.memberships.length === tournament.playersPerTeam ? 'text-success' : 'text-text-muted'}`}>
                    {team.memberships.length} / {tournament.playersPerTeam}
                  </span>
                  {avgRating !== null && (
                    <span className="text-success text-xs font-semibold">· ★ {avgRating}</span>
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
                    <Avatar
                      src={m.player.user.avatarUrl}
                      name={m.player.user.name}
                      size="xs"
                    />
                    <span className="text-sm text-text-primary flex-1">{m.player.user.name}</span>
                    <span className="w-10 text-right shrink-0 text-success text-xs font-semibold">
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
                  <p className="text-xs text-text-muted">No players assigned yet.</p>
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
            </div>
          )
        })}
      </div>

      {isAdmin && tournament.teams.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-text-muted text-sm">
            No teams created yet. Use the form above to create the first team.
          </p>
        </div>
      )}
    </div>
  )
}
