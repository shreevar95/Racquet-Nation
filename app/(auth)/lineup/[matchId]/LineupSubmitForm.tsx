'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { submitLineup } from '@/actions/lineup'
import { getPlayersPerSide, getGameTypeLabel } from '@/lib/gameTypes'

interface Player {
  playerId: string
  name: string
  avatarUrl: string | null
}

interface ExistingSlot {
  gameNumber: number
  position: number
  playerId: string
}

interface Props {
  matchId: string
  teamId: string
  gamesPerMatch: number
  playersPerSide: number
  gameTypes: Record<string, string>
  roster: Player[]
  existingSlots: ExistingSlot[]
}

type SlotKey = `${number}-${number}`

export function LineupSubmitForm({
  matchId,
  teamId,
  gamesPerMatch,
  playersPerSide,
  gameTypes,
  roster,
  existingSlots,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)

  const initialSlots: Record<SlotKey, string> = {}
  existingSlots.forEach((s) => {
    initialSlots[`${s.gameNumber}-${s.position}` as SlotKey] = s.playerId
  })

  const [slots, setSlots] = useState<Record<SlotKey, string>>(initialSlots)

  function setSlot(game: number, position: number, playerId: string) {
    setSlots((prev) => ({ ...prev, [`${game}-${position}` as SlotKey]: playerId }))
  }

  function slotsForGame(game: number): number {
    return getPlayersPerSide(gameTypes[String(game)], playersPerSide)
  }

  function getConflicts(game: number): Set<string> {
    const usedInGame: Record<string, number> = {}
    for (let p = 1; p <= slotsForGame(game); p++) {
      const pid = slots[`${game}-${p}` as SlotKey]
      if (pid) usedInGame[pid] = (usedInGame[pid] ?? 0) + 1
    }
    return new Set(Object.entries(usedInGame).filter(([, c]) => c > 1).map(([id]) => id))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const slotArray: { gameNumber: number; position: number; playerId: string }[] = []
    for (let game = 1; game <= gamesPerMatch; game++) {
      for (let pos = 1; pos <= slotsForGame(game); pos++) {
        const pid = slots[`${game}-${pos}` as SlotKey]
        if (!pid) {
          toast.error(`Game ${game}, Position ${pos} is empty`)
          return
        }
        slotArray.push({ gameNumber: game, position: pos, playerId: pid })
      }
    }

    // Every roster player must appear in at least one slot
    const usedPlayerIds = new Set(slotArray.map((s) => s.playerId))
    const benchedPlayers = roster.filter((p) => !usedPlayerIds.has(p.playerId))
    if (benchedPlayers.length > 0) {
      toast.error(
        `All players must play. Not assigned: ${benchedPlayers.map((p) => p.name).join(', ')}`,
      )
      return
    }

    startTransition(async () => {
      const result = await submitLineup({ matchId, teamId, slots: slotArray })
      if (result.success) {
        setSubmitted(true)
        toast.success('Lineup submitted!')
      } else {
        toast.error(result.error)
      }
    })
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-success/30 bg-success-bg p-6 text-center space-y-2">
        <p className="text-success font-semibold">Lineup Submitted</p>
        <p className="text-sm text-text-secondary">
          Your lineup is locked in. You will be notified when both teams have submitted.
        </p>
      </div>
    )
  }

  // Build a map: playerId → sorted list of game numbers they appear in
  const playerGames: Record<string, number[]> = {}
  for (let g = 1; g <= gamesPerMatch; g++) {
    for (let p = 1; p <= slotsForGame(g); p++) {
      const pid = slots[`${g}-${p}` as SlotKey]
      if (pid) {
        if (!playerGames[pid]) playerGames[pid] = []
        if (!playerGames[pid].includes(g)) playerGames[pid].push(g)
      }
    }
  }
  const multiGamePlayers = roster.filter((p) => (playerGames[p.playerId]?.length ?? 0) > 1)

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {Array.from({ length: gamesPerMatch }, (_, i) => i + 1).map((game) => {
        const conflicts = getConflicts(game)
        const typeLabel = getGameTypeLabel(gameTypes[String(game)])
        return (
          <div key={game} className="rounded-lg border border-border bg-surface-raised p-4 space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-text-primary">Game {game}</p>
              {typeLabel && (
                <span className="text-xs font-medium text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full">
                  {typeLabel}
                </span>
              )}
            </div>
            {Array.from({ length: slotsForGame(game) }, (_, j) => j + 1).map((position) => {
              const key = `${game}-${position}` as SlotKey
              const selected = slots[key]
              const isConflict = selected && conflicts.has(selected)

              return (
                <div key={position} className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-muted">
                    Player {position}
                  </label>
                  <select
                    value={selected ?? ''}
                    onChange={(e) => setSlot(game, position, e.target.value)}
                    required
                    className={[
                      'h-10 rounded-md border px-3 text-sm text-text-primary focus:outline-none focus:ring-2',
                      isConflict
                        ? 'border-error bg-error-bg focus:ring-error/20'
                        : 'border-border bg-surface focus:border-brand-500 focus:ring-brand-500/20',
                    ].join(' ')}
                  >
                    <option value="">Select player...</option>
                    {roster.map((p) => {
                      // Show which other games this player is already in
                      const otherGames = (playerGames[p.playerId] ?? []).filter((g) => g !== game)
                      const suffix = otherGames.length > 0 ? ` (also G${otherGames.join(', G')})` : ''
                      return (
                        <option key={p.playerId} value={p.playerId}>
                          {p.name}{suffix}
                        </option>
                      )
                    })}
                  </select>
                  {isConflict && (
                    <p className="text-xs text-error">Player already used in this game</p>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      {/* Players selected in multiple games */}
      {multiGamePlayers.length > 0 && (
        <div className="rounded-lg border border-info/30 bg-info-bg px-4 py-3 text-sm text-info space-y-1">
          <p className="font-semibold">Playing multiple games</p>
          {multiGamePlayers.map((p) => (
            <p key={p.playerId}>
              {p.name} — Games {playerGames[p.playerId].join(', ')}
            </p>
          ))}
        </div>
      )}

      {/* Players not yet assigned */}
      {(() => {
        const usedIds = new Set(Object.values(slots).filter(Boolean))
        const unassigned = roster.filter((p) => !usedIds.has(p.playerId))
        if (unassigned.length === 0) return null
        return (
          <div className="rounded-lg border border-warning/40 bg-warning-bg px-4 py-3 text-sm text-warning">
            <p className="font-semibold mb-1">Not yet assigned ({unassigned.length})</p>
            <p>{unassigned.map((p) => p.name).join(', ')}</p>
          </div>
        )
      })()}

      <Button type="submit" loading={isPending} className="w-full" size="lg">
        Submit Lineup
      </Button>
    </form>
  )
}
