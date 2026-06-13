'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Shuffle, RefreshCw, Undo2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { autoCreateTeams, randomiseTeamAssignments, restoreTeamSnapshot } from '@/actions/team'

type SnapshotMembership = { teamId: string; playerId: string; role: 'PLAYER' | 'CAPTAIN' | 'MANAGER' }
type SnapshotCaptain = { teamId: string; captainId: string | null }

interface UndoState {
  memberships: SnapshotMembership[]
  captains: SnapshotCaptain[]
  createdTeamIds: string[]
}

interface Props {
  tournamentId: string
  numTeams: number
  hasTeams: boolean
  unassignedCount: number
  snapshot: { memberships: SnapshotMembership[]; captains: SnapshotCaptain[] }
}

export function RandomiseTeamsButton({
  tournamentId,
  numTeams,
  hasTeams,
  unassignedCount,
  snapshot,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [undoState, setUndoState] = useState<UndoState | null>(null)

  function handleAutoCreate() {
    startTransition(async () => {
      const result = await autoCreateTeams(tournamentId)
      if (result.success) {
        toast.success(`${result.created} teams created.`)
      } else {
        toast.error(result.error ?? 'Something went wrong')
      }
    })
  }

  function handleRandomise(clearExisting: boolean) {
    if (
      clearExisting &&
      !window.confirm('Clear all current assignments and re-randomise from scratch?')
    ) return

    const preSnapshot = snapshot

    startTransition(async () => {
      const result = await randomiseTeamAssignments(tournamentId, clearExisting)
      if (result.success) {
        if (result.assigned === 0) {
          toast.info('No unassigned players to distribute.')
        } else {
          setUndoState({
            memberships: preSnapshot.memberships,
            captains: preSnapshot.captains,
            createdTeamIds: result.createdTeamIds,
          })
          toast.success(
            `${result.assigned} player${result.assigned !== 1 ? 's' : ''} assigned — balanced by rating.`,
          )
        }
      } else {
        toast.error(result.error ?? 'Something went wrong')
      }
    })
  }

  function handleUndo() {
    if (!undoState) return
    startTransition(async () => {
      const result = await restoreTeamSnapshot({
        tournamentId,
        memberships: undoState.memberships,
        captains: undoState.captains,
        createdTeamIds: undoState.createdTeamIds,
      })
      if (result.success) {
        setUndoState(null)
        toast.success('Reverted to previous team assignments.')
      } else {
        toast.error(result.error ?? 'Could not undo')
      }
    })
  }

  // Label for the team range, e.g. "Team A – Team H"
  const teamRange =
    numTeams <= 26
      ? `Team A – Team ${String.fromCharCode(64 + numTeams)}`
      : `${numTeams} teams`

  return (
    <div className="rounded-lg border border-border bg-surface-raised overflow-hidden">
      <div className="h-0.5 bg-gradient-to-r from-brand-500 to-green-400" />

      <div className="divide-y divide-border">
        {/* Step 1 — Create Teams */}
        <div className="p-4 flex items-center gap-4">
          <div
            className={[
              'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black font-display',
              hasTeams
                ? 'bg-green-400/20 text-green-400'
                : 'bg-brand-500/20 text-brand-400',
            ].join(' ')}
          >
            {hasTeams ? <Check size={12} strokeWidth={3} /> : '1'}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">Auto-create Teams</p>
            <p className="text-xs text-text-secondary mt-0.5">
              {hasTeams
                ? `Teams already created`
                : `Creates ${teamRange} and distributes them across groups`}
            </p>
          </div>

          {!hasTeams && (
            <Button
              onClick={handleAutoCreate}
              loading={isPending}
              size="sm"
              className="shrink-0 font-display font-bold uppercase tracking-wide text-xs"
            >
              Create Teams
            </Button>
          )}
        </div>

        {/* Step 2 — Randomise Players */}
        <div className={['p-4 flex items-center gap-4', !hasTeams ? 'opacity-40 pointer-events-none select-none' : ''].join(' ')}>
          <div
            className={[
              'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black font-display',
              undoState
                ? 'bg-green-400/20 text-green-400'
                : 'bg-surface-overlay text-text-muted',
            ].join(' ')}
          >
            {undoState ? <Check size={12} strokeWidth={3} /> : '2'}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">Randomise Players</p>
            <p className="text-xs text-text-secondary mt-0.5">
              {unassignedCount > 0
                ? `${unassignedCount} player${unassignedCount !== 1 ? 's' : ''} waiting · distributed by rating`
                : 'All players are assigned'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {undoState && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                loading={isPending}
                className="gap-1.5 text-xs text-brand-400 hover:text-text-primary border border-brand-500/30 hover:border-brand-500"
              >
                <Undo2 size={13} />
                Undo
              </Button>
            )}

            {unassignedCount > 0 && (
              <Button
                size="sm"
                onClick={() => handleRandomise(false)}
                loading={isPending}
                className="gap-1.5 font-display font-bold uppercase tracking-wide text-xs shrink-0"
              >
                <Shuffle size={13} />
                Randomise
              </Button>
            )}

            {hasTeams && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRandomise(true)}
                loading={isPending}
                title="Clear all assignments and re-randomise"
                className="gap-1.5 text-xs text-text-muted hover:text-warning shrink-0"
              >
                <RefreshCw size={13} />
                Re-randomise
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
