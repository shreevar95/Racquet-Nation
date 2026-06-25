'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { rnButtonVariants } from '@/components/rn/RnButton'
import { RnCard } from '@/components/rn/RnCard'
import { RnTeamTile } from '@/components/rn/RnTeamTile'
import { RnBottomSheet } from '@/components/rn/RnBottomSheet'
import { cn } from '@/lib/utils'
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

const PLAYER_COLORS = ['#F26B21', '#19A463', '#F4C24B', '#3E9BD8', '#6E86A8', '#B07CC0']

function colorFor(roster: Player[], playerId: string): string {
  const i = roster.findIndex((p) => p.playerId === playerId)
  return PLAYER_COLORS[i % PLAYER_COLORS.length] ?? '#13243A'
}

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
  const [picking, setPicking] = useState<SlotKey | null>(null)

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

  // All (game, position) slot keys, in display order
  const allSlotKeys: { key: SlotKey; game: number; position: number }[] = []
  for (let game = 1; game <= gamesPerMatch; game++) {
    for (let pos = 1; pos <= slotsForGame(game); pos++) {
      allSlotKeys.push({ key: `${game}-${pos}` as SlotKey, game, position: pos })
    }
  }
  const filledCount = allSlotKeys.filter(({ key }) => !!slots[key]).length
  const allFilled = filledCount === allSlotKeys.length

  if (submitted) {
    return (
      <RnCard className="p-6 text-center shadow-[0_12px_28px_rgba(43,52,58,.10)]">
        <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-saffron-tint text-[26px] text-saffron">
          🔒
        </div>
        <div className="text-xl font-black tracking-tight text-ink">Lineup sealed</div>
        <div className="mx-auto mt-2 max-w-[260px] text-sm leading-relaxed text-rn-text-muted">
          Your selections are locked and hidden. They&apos;ll be visible once the admin reveals both lineups.
        </div>

        <div className="mt-4 rounded-xl bg-[#f7fafb] p-3.5 text-left">
          {allSlotKeys.map(({ key, game, position }) => {
            const pid = slots[key]
            const player = roster.find((p) => p.playerId === pid)
            const typeLabel = getGameTypeLabel(gameTypes[String(game)])
            return (
              <div key={key} className="flex justify-between py-1.5 text-sm">
                <span className="font-semibold text-rn-text-muted">
                  Game {game}{typeLabel ? ` · ${typeLabel}` : ''} · P{position}
                </span>
                <span className="font-extrabold text-ink">{player?.name ?? '—'}</span>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-4 text-xs font-extrabold text-saffron"
        >
          Edit lineup
        </button>
      </RnCard>
    )
  }

  const pickingSlot = picking ? { game: Number(picking.split('-')[0]), position: Number(picking.split('-')[1]) } : null

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <div className="mb-2.5 text-[11px] font-extrabold tracking-[.14em] text-rn-text-muted">
          ASSIGN YOUR POSITIONS
        </div>
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {Array.from({ length: gamesPerMatch }, (_, i) => i + 1).map((game) => {
            const conflicts = getConflicts(game)
            const typeLabel = getGameTypeLabel(gameTypes[String(game)])
            return (
              <RnCard key={game} className="p-3.5">
                <div className="mb-2.5 flex items-center gap-2">
                  <span className="text-sm font-extrabold text-ink">Game {game}</span>
                  {typeLabel && (
                    <span className="rounded-full bg-saffron-tint px-2 py-0.5 text-xs font-bold text-saffron">
                      {typeLabel}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {Array.from({ length: slotsForGame(game) }, (_, j) => j + 1).map((position) => {
                    const key = `${game}-${position}` as SlotKey
                    const selected = slots[key]
                    const player = roster.find((p) => p.playerId === selected)
                    const isConflict = selected && conflicts.has(selected)
                    const otherGames = player ? (playerGames[player.playerId] ?? []).filter((g) => g !== game) : []

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPicking(key)}
                        className={cn(
                          'flex items-center justify-between gap-3 rounded-xl border bg-rn-card px-3.5 py-3 text-left',
                          isConflict ? 'border-red-down bg-red-down/5' : 'border-rn-border',
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {player && <RnTeamTile name={player.name} color={colorFor(roster, player.playerId)} size="sm" />}
                          <div className="min-w-0">
                            <div className="text-[10px] font-extrabold tracking-[.1em] text-rn-text-muted">
                              Player {position}
                            </div>
                            <div className={cn('mt-0.5 truncate text-sm', player ? 'font-extrabold text-ink' : 'font-semibold text-rn-text-muted')}>
                              {player ? player.name : 'Tap to assign'}
                              {otherGames.length > 0 && (
                                <span className="text-rn-text-muted"> (also G{otherGames.join(', G')})</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs font-extrabold text-saffron">
                          {player ? 'Change' : 'Select'}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {[...conflicts].length > 0 && (
                  <p className="mt-2 text-xs font-semibold text-red-down">Player already used in this game</p>
                )}
              </RnCard>
            )
          })}
        </div>
      </div>

      {/* Players selected in multiple games */}
      {multiGamePlayers.length > 0 && (
        <div className="rounded-xl border border-rn-blue/30 bg-rn-blue/10 px-4 py-3 text-sm text-rn-blue">
          <p className="font-extrabold">Playing multiple games</p>
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
          <div className="rounded-xl border border-saffron/30 bg-saffron-tint px-4 py-3 text-sm text-saffron">
            <p className="mb-1 font-extrabold">Not yet assigned ({unassigned.length})</p>
            <p className="font-semibold">{unassigned.map((p) => p.name).join(', ')}</p>
          </div>
        )
      })()}

      <button
        type="button"
        onClick={() => {
          const optimized = optimizeLineup(roster, gamesPerMatch, gameTypes, playersPerSide)
          setSlots(optimized as Record<SlotKey, string>)
          toast.success('Lineup optimized by rating')
        }}
        className={cn(rnButtonVariants({ variant: 'secondary' }), 'w-full')}
      >
        ★ Auto-optimize Lineup
      </button>

      <div>
        <button
          type="submit"
          disabled={!allFilled || isPending}
          className={cn(rnButtonVariants({ variant: 'primary', size: 'lg' }), 'w-full')}
        >
          {isPending ? 'Submitting…' : 'Lock in lineup'}
        </button>
        <p className="mt-2.5 text-center text-xs font-semibold text-rn-text-muted">
          {filledCount} of {allSlotKeys.length} positions set
        </p>
      </div>

      <RnBottomSheet open={picking !== null} onClose={() => setPicking(null)} title="Choose a player">
        <div className="flex flex-col gap-2">
          {roster.map((p) => {
            const otherGames = pickingSlot
              ? (playerGames[p.playerId] ?? []).filter((g) => g !== pickingSlot.game)
              : []
            return (
              <button
                key={p.playerId}
                type="button"
                onClick={() => {
                  if (pickingSlot) setSlot(pickingSlot.game, pickingSlot.position, p.playerId)
                  setPicking(null)
                }}
                className="flex items-center gap-2.5 rounded-xl border border-rn-border bg-rn-card px-3.5 py-3 text-left"
              >
                <RnTeamTile name={p.name} color={colorFor(roster, p.playerId)} size="sm" />
                <span className="text-sm font-bold text-ink">
                  {p.name}
                  {p.rating != null && <span className="text-rn-text-muted"> [{p.rating.toFixed(1)}]</span>}
                  {otherGames.length > 0 && (
                    <span className="text-rn-text-muted"> (also G{otherGames.join(', G')})</span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </RnBottomSheet>
    </form>
  )
}
