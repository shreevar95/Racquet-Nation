'use client'

import { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Minus, Plus, ArrowLeft, Check, AlertTriangle } from 'lucide-react'
import { rnButtonVariants } from '@/components/rn/RnButton'
import { cn } from '@/lib/utils'
import { enterMatchScores, savePartialScores, getMatchScores } from '@/actions/score'

interface Team { id: string; name: string }
interface GameScore { gameNumber: number; homeScore: number; awayScore: number }

interface Props {
  matchId: string
  tournamentSlug: string
  homeTeam: Team
  awayTeam: Team
  gamesPerMatch: number
  tiebreakEnabled: boolean
  pointsToWin: number
  existingGames: GameScore[]
}

// A score is a legal final score for a game:
//   - winner reaches pointsToWin, wins by ≥ 2
//   - no deuce: winner must be exactly pointsToWin (can't overshoot)
//   - deuce (loser ≥ pointsToWin - 1): winner must be exactly loser + 2
function isValidFinalScore(w: number, l: number, p: number): boolean {
  if (w < p) return false
  if (w - l < 2) return false
  if (l <= p - 2) return w === p
  return w === l + 2
}

function gameWinner(home: number, away: number, p: number): 'home' | 'away' | null {
  if (isValidFinalScore(home, away, p)) return 'home'
  if (isValidFinalScore(away, home, p)) return 'away'
  return null
}

// Score is impossible (e.g. 14-8 in a game to 11)
function isImpossibleScore(home: number, away: number, p: number): boolean {
  if (home === 0 && away === 0) return false
  const w = Math.max(home, away)
  const l = Math.min(home, away)
  if (w < p) return false // still in progress, not impossible yet
  // Winner has reached p — check if the score could legally arise
  if (l <= p - 2) return w !== p // no deuce: winner must be exactly p
  // Deuce territory: diff must be exactly 2
  return w - l !== 2
}

function isGameComplete(home: number, away: number, p: number): boolean {
  return gameWinner(home, away, p) !== null
}

// Inline score input — supports direct typing + shows the number large
function ScoreInput({
  value,
  onChange,
  winner,
  invalid,
}: {
  value: number
  onChange: (n: number) => void
  winner: boolean
  invalid?: boolean
}) {
  const [raw, setRaw] = useState(String(value))

  useEffect(() => { setRaw(String(value)) }, [value])

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={raw}
      onChange={(e) => {
        const digits = e.target.value.replace(/[^0-9]/g, '')
        setRaw(digits)
        const n = parseInt(digits)
        if (!isNaN(n) && n >= 0) onChange(n)
        else if (digits === '') onChange(0)
      }}
      onFocus={(e) => e.target.select()}
      onBlur={() => {
        const n = parseInt(raw)
        const clamped = isNaN(n) ? 0 : Math.max(0, n)
        setRaw(String(clamped))
        onChange(clamped)
      }}
      className={cn(
        'w-16 border-b-2 bg-transparent text-center text-4xl font-black tabular-nums outline-none transition-colors',
        invalid ? 'border-red-down/60 text-red-down' : winner ? 'border-rn-green/40 text-rn-green' : 'border-rn-border text-ink focus:border-saffron',
      )}
    />
  )
}

export function ScoreEntryForm({
  matchId,
  tournamentSlug,
  homeTeam,
  awayTeam,
  gamesPerMatch,
  tiebreakEnabled,
  pointsToWin,
  existingGames,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const initialScores: GameScore[] = Array.from({ length: gamesPerMatch }, (_, i) => {
    const existing = existingGames.find((g) => g.gameNumber === i + 1)
    return { gameNumber: i + 1, homeScore: existing?.homeScore ?? 0, awayScore: existing?.awayScore ?? 0 }
  })
  // Include tiebreak game if it was already saved to DB
  const savedTiebreak = existingGames.find((g) => g.gameNumber === gamesPerMatch + 1)
  if (savedTiebreak) initialScores.push(savedTiebreak)

  const [scores, setScores] = useState<GameScore[]>(initialScores)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const isFirstRender = useState(true)
  const lastEditAt = useRef<number>(0)

  // Autosave on every change (debounced 800ms), skip the initial mount
  useEffect(() => {
    if (isFirstRender[0]) { isFirstRender[1](false); return }
    setSaveStatus('saving')
    const timer = setTimeout(() => {
      savePartialScores({ matchId, games: scores }).then((result) => {
        setSaveStatus(result.success ? 'saved' : 'error')
      })
    }, 800)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scores])

  // Pull latest scores from DB — only when no edits in the last 5s
  const syncFromServer = useCallback(async () => {
    if (Date.now() - lastEditAt.current < 5000) return
    const result = await getMatchScores(matchId)
    if (result.games.length > 0) {
      setScores((prev) =>
        prev.map((g) => {
          const fresh = result.games.find((fg) => fg.gameNumber === g.gameNumber)
          return fresh ? { ...g, homeScore: fresh.homeScore, awayScore: fresh.awayScore } : g
        }),
      )
    }
  }, [matchId])

  // Poll every 10 seconds
  useEffect(() => {
    const interval = setInterval(syncFromServer, 10_000)
    return () => clearInterval(interval)
  }, [syncFromServer])

  // Refresh on tab focus
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') syncFromServer() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [syncFromServer])

  function setScore(gameIndex: number, side: 'home' | 'away', value: number) {
    lastEditAt.current = Date.now()
    setScores((prev) =>
      prev.map((g, i) => {
        if (i !== gameIndex) return g
        return side === 'home' ? { ...g, homeScore: value } : { ...g, awayScore: value }
      }),
    )
  }

  function adjust(gameIndex: number, side: 'home' | 'away', delta: number) {
    lastEditAt.current = Date.now()
    setScores((prev) =>
      prev.map((g, i) => {
        if (i !== gameIndex) return g
        if (side === 'home') return { ...g, homeScore: Math.max(0, g.homeScore + delta) }
        return { ...g, awayScore: Math.max(0, g.awayScore + delta) }
      }),
    )
  }

  // Auto-add tiebreak game when regular games result in a draw
  const scoreKey = scores.slice(0, gamesPerMatch).map((g) => `${g.homeScore}-${g.awayScore}`).join(',')
  useEffect(() => {
    if (!tiebreakEnabled) return
    const regular = scores.slice(0, gamesPerMatch)
    const hWins = regular.filter((g) => gameWinner(g.homeScore, g.awayScore, pointsToWin) === 'home').length
    const aWins = regular.filter((g) => gameWinner(g.homeScore, g.awayScore, pointsToWin) === 'away').length
    const allDone = regular.every((g) => isGameComplete(g.homeScore, g.awayScore, pointsToWin))
    const isDraw = allDone && hWins === aWins
    if (isDraw && scores.length === gamesPerMatch) {
      setScores((prev) => [...prev, { gameNumber: gamesPerMatch + 1, homeScore: 0, awayScore: 0 }])
    } else if (!isDraw && scores.length > gamesPerMatch) {
      setScores((prev) => prev.slice(0, gamesPerMatch))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoreKey, tiebreakEnabled, gamesPerMatch, pointsToWin])

  // Live match score summary
  const regularScores = scores.slice(0, gamesPerMatch)
  const homeWins = regularScores.filter((g) => gameWinner(g.homeScore, g.awayScore, pointsToWin) === 'home').length
  const awayWins = regularScores.filter((g) => gameWinner(g.homeScore, g.awayScore, pointsToWin) === 'away').length
  const hasTiebreakGame = scores.length > gamesPerMatch
  const tiebreakScore = hasTiebreakGame ? scores[gamesPerMatch] : null
  const tiebreakWinner = tiebreakScore ? gameWinner(tiebreakScore.homeScore, tiebreakScore.awayScore, pointsToWin) : null
  const allComplete = regularScores.every((g) => isGameComplete(g.homeScore, g.awayScore, pointsToWin))
  const anyImpossible = scores.some((g) => isImpossibleScore(g.homeScore, g.awayScore, pointsToWin))

  // Allow submit when all games have valid final scores and none are impossible
  const hasDecisiveWinner = Math.max(homeWins, awayWins) > gamesPerMatch / 2
  const tiebreakComplete = !hasTiebreakGame || (tiebreakScore !== null && isGameComplete(tiebreakScore.homeScore, tiebreakScore.awayScore, pointsToWin))
  const canSubmit = !anyImpossible && tiebreakComplete && (allComplete || hasDecisiveWinner)

  function handleSubmit() {
    startTransition(async () => {
      const result = await enterMatchScores({ matchId, games: scores })
      if (result.success) {
        if (result.requiresTiebreak) {
          toast.success('Scores saved — tiebreak required!')
        } else {
          toast.success('Result confirmed!')
        }
        router.push(`/manage/${tournamentSlug}/scoring`)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-paper font-nunito text-ink">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-rn-border px-4">
        <button
          onClick={() => router.push(`/manage/${tournamentSlug}/scoring`)}
          className="flex items-center gap-1.5 text-rn-text-secondary transition-colors hover:text-ink"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Back</span>
        </button>
        <div className="text-center">
          <p className="text-xs text-rn-text-muted">Match Score</p>
          <p className="text-sm font-bold text-ink">
            {homeTeam.name} <span className="text-saffron">{homeWins}</span>
            {' – '}
            <span className="text-saffron">{awayWins}</span> {awayTeam.name}
          </p>
        </div>
        <div className="w-16 text-right">
          {saveStatus === 'saving' && <span className="text-[10px] text-rn-text-muted">Saving…</span>}
          {saveStatus === 'saved' && <span className="text-[10px] text-rn-green">Saved</span>}
          {saveStatus === 'error' && <span className="text-[10px] text-red-down">Error</span>}
        </div>
      </div>

      {/* Score rows */}
      <div className="flex-1 overflow-y-auto">
        {hasTiebreakGame && (
          <div className="border-b border-rn-yellow/20 bg-rn-yellow/15 px-4 py-2 text-center">
            <p className="text-xs font-bold text-ink">
              Tied {homeWins}–{awayWins} — enter tiebreak game below
            </p>
          </div>
        )}

        <div className="divide-y divide-rn-border">
          {scores.map((game, i) => {
            const isTiebreakGame = i === gamesPerMatch
            const winner = gameWinner(game.homeScore, game.awayScore, pointsToWin)
            const impossible = isImpossibleScore(game.homeScore, game.awayScore, pointsToWin)
            return (
              <div key={game.gameNumber} className={cn('px-4 py-5', isTiebreakGame && 'bg-rn-yellow/10')}>
                <p className="mb-4 text-center text-xs font-extrabold uppercase tracking-wider text-rn-text-muted">
                  {isTiebreakGame ? '⚡ Tiebreak Game' : `Game ${game.gameNumber}`}
                  {winner && !impossible && (
                    <span className="ml-2 text-rn-green">
                      — {winner === 'home' ? homeTeam.name : awayTeam.name} wins
                    </span>
                  )}
                  {impossible && (
                    <span className="ml-2 inline-flex items-center gap-1 text-red-down">
                      <AlertTriangle size={12} />
                      impossible score
                    </span>
                  )}
                </p>

                <div className="flex items-center justify-between gap-4">
                  {/* Home team */}
                  <div className="flex flex-1 flex-col items-center gap-3">
                    <p className="w-full truncate text-center text-xs text-rn-text-secondary">{homeTeam.name}</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adjust(i, 'home', -1)}
                        className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-rn-border text-rn-text-secondary transition-all hover:border-saffron hover:text-saffron active:scale-95"
                      >
                        <Minus size={16} />
                      </button>
                      <ScoreInput
                        value={game.homeScore}
                        onChange={(n) => setScore(i, 'home', n)}
                        winner={winner === 'home' && !impossible}
                        invalid={impossible}
                      />
                      <button
                        type="button"
                        onClick={() => adjust(i, 'home', 1)}
                        className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-rn-border text-rn-text-secondary transition-all hover:border-saffron hover:text-saffron active:scale-95"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  <span className="self-end pb-2 text-xl font-light text-rn-text-muted">—</span>

                  {/* Away team */}
                  <div className="flex flex-1 flex-col items-center gap-3">
                    <p className="w-full truncate text-center text-xs text-rn-text-secondary">{awayTeam.name}</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adjust(i, 'away', -1)}
                        className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-rn-border text-rn-text-secondary transition-all hover:border-saffron hover:text-saffron active:scale-95"
                      >
                        <Minus size={16} />
                      </button>
                      <ScoreInput
                        value={game.awayScore}
                        onChange={(n) => setScore(i, 'away', n)}
                        winner={winner === 'away' && !impossible}
                        invalid={impossible}
                      />
                      <button
                        type="button"
                        onClick={() => adjust(i, 'away', 1)}
                        className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-rn-border text-rn-text-secondary transition-all hover:border-saffron hover:text-saffron active:scale-95"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom submit */}
      <div className="shrink-0 space-y-2 border-t border-rn-border px-4 py-3 pb-safe">
        {anyImpossible && (
          <p className="flex items-center justify-center gap-1 text-center text-xs text-red-down">
            <AlertTriangle size={12} />
            Fix impossible score(s) — game to {pointsToWin}, win by 2
          </p>
        )}
        {!canSubmit && !anyImpossible && (
          <p className="text-center text-xs text-rn-text-muted">
            {scores.filter((g) => isGameComplete(g.homeScore, g.awayScore, pointsToWin)).length} / {gamesPerMatch} games complete
          </p>
        )}
        {hasDecisiveWinner && !allComplete && !anyImpossible && (
          <p className="text-center text-xs text-rn-text-muted">
            Match decided — {homeWins > awayWins ? homeTeam.name : awayTeam.name} wins {Math.max(homeWins, awayWins)}–{Math.min(homeWins, awayWins)}
          </p>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || !canSubmit}
          className={cn(rnButtonVariants({ variant: 'primary', size: 'lg' }), 'w-full')}
        >
          <Check size={18} />
          {isPending ? 'Saving…' : canSubmit ? 'Confirm Result' : 'Enter all game scores to submit'}
        </button>
      </div>
    </div>
  )
}
