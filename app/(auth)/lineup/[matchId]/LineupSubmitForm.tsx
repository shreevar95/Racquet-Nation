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
  rating: number | null
  gender: string | null
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

function optimizeLineup(
  roster: Player[],
  gamesPerMatch: number,
  gameTypes: Record<string, string>,
  defaultPlayersPerSide: number,
): Record<string, string> {
  const sorted = [...roster].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  const males = sorted.filter(p => p.gender === 'MALE')
  const females = sorted.filter(p => p.gender === 'FEMALE')
  const open = sorted.filter(p => !p.gender || p.gender === 'OTHER')

  const used = new Set<string>()

  function takeFrom(pool: Player[], n: number): string[] {
    const taken: string[] = []
    for (const p of pool) {
      if (taken.length >= n) break
      if (!used.has(p.playerId)) {
        taken.push(p.playerId)
        used.add(p.playerId)
      }
    }
    return taken
  }

  function slotsForGame(g: number) {
    return getPlayersPerSide(gameTypes[String(g)], defaultPlayersPerSide)
  }

  // Process gender-constrained games first so their specific pools aren't drained
  const CONSTRAINT_ORDER = ['MENS_SINGLES', 'WOMENS_SINGLES', 'MENS_DOUBLES', 'WOMENS_DOUBLES', 'MIXED_DOUBLES']
  const gameOrder = Array.from({ length: gamesPerMatch }, (_, i) => i + 1).sort((a, b) => {
    const tA = gameTypes[String(a)] ?? ''
    const tB = gameTypes[String(b)] ?? ''
    const iA = CONSTRAINT_ORDER.indexOf(tA)
    const iB = CONSTRAINT_ORDER.indexOf(tB)
    return (iA === -1 ? 99 : iA) - (iB === -1 ? 99 : iB)
  })

  const assignment: Record<number, string[]> = {}
  for (let g = 1; g <= gamesPerMatch; g++) assignment[g] = []

  for (const g of gameOrder) {
    const type = gameTypes[String(g)] ?? ''
    const slots = slotsForGame(g)

    if (type === 'MIXED_DOUBLES') {
      const m = takeFrom(males, 1)
      const f = takeFrom(females, 1)
      const extra = takeFrom([...open, ...sorted], slots - m.length - f.length)
      assignment[g] = [...m, ...f, ...extra]
    } else if (type === 'MENS_DOUBLES' || type === 'MENS_SINGLES') {
      const picked = takeFrom(males, slots)
      const fill = takeFrom([...open, ...females, ...sorted], slots - picked.length)
      assignment[g] = [...picked, ...fill]
    } else if (type === 'WOMENS_DOUBLES' || type === 'WOMENS_SINGLES') {
      const picked = takeFrom(females, slots)
      const fill = takeFrom([...open, ...males, ...sorted], slots - picked.length)
      assignment[g] = [...picked, ...fill]
    } else {
      assignment[g] = takeFrom(sorted, slots)
    }
  }

  // Ensure everyone plays: add unassigned players to their best game
  const unassigned = roster.filter(p => !used.has(p.playerId))
  for (const player of unassigned) {
    let bestGame = gameOrder[gameOrder.length - 1]
    let fewest = Infinity
    for (let g = 1; g <= gamesPerMatch; g++) {
      if (assignment[g].length < fewest) {
        fewest = assignment[g].length
        bestGame = g
      }
    }
    assignment[bestGame].push(player.playerId)
  }

  const result: Record<string, string> = {}
  for (let g = 1; g <= gamesPerMatch; g++) {
    assignment[g].forEach((pid, idx) => {
      result[`${g}-${idx + 1}`] = pid
    })
  }
  return result
}

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
      <div className="space-y-3">
        <div className="rounded-lg border border-success/30 bg-success-bg p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-success font-semibold text-sm">Lineup saved</p>
            <p className="text-xs text-text-secondary mt-0.5">
              You can edit it until the admin closes the submission window.
            </p>
          </div>
          <button
            onClick={() => setSubmitted(false)}
            className="text-xs font-semibold text-brand-400 hover:text-brand-300 border border-brand-500/40 rounded px-3 py-1.5 transition-colors shrink-0"
          >
            Edit Lineup
          </button>
        </div>
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
                          {p.name}{p.rating != null ? ` [${p.rating.toFixed(1)}]` : ''}{suffix}
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

      {/* Auto-optimize button */}
      <button
        type="button"
        onClick={() => {
          const optimized = optimizeLineup(roster, gamesPerMatch, gameTypes, playersPerSide)
          setSlots(optimized as Record<SlotKey, string>)
          toast.success('Lineup optimized by rating')
        }}
        className="w-full py-2.5 rounded-lg border border-success/40 text-success text-sm font-semibold hover:bg-success/10 transition-colors"
      >
        ★ Auto-optimize Lineup
      </button>

      <Button type="submit" loading={isPending} className="w-full" size="lg">
        Submit Lineup
      </Button>
    </form>
  )
}
