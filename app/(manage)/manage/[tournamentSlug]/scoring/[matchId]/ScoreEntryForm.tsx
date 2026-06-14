'use client'

import { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Minus, Plus, ArrowLeft, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  existingGames: GameScore[]
}

// A game is won when one team reaches 11+ with a 2-point gap
function gameWinner(home: number, away: number): 'home' | 'away' | null {
  const lead = Math.abs(home - away)
  if (lead < 2) return null
  if (home >= 11 && home > away) return 'home'
  if (away >= 11 && away > home) return 'away'
  return null
}

function isGameComplete(home: number, away: number): boolean {
  return gameWinner(home, away) !== null
}

// Inline score input — supports direct typing + shows the number large
function ScoreInput({
  value,
  onChange,
  winner,
}: {
  value: number
  onChange: (n: number) => void
  winner: boolean
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
      className={[
        'text-4xl font-black w-16 text-center tabular-nums bg-transparent border-b-2 outline-none transition-colors',
        winner ? 'text-success border-success/40' : 'text-text-primary border-border focus:border-brand-500',
      ].join(' ')}
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
    const hLeads = regular.filter((g) => g.homeScore > g.awayScore).length
    const aLeads = regular.filter((g) => g.awayScore > g.homeScore).length
    const isDraw = hLeads === aLeads && hLeads + aLeads === gamesPerMatch
    if (isDraw && scores.length === gamesPerMatch) {
      setScores((prev) => [...prev, { gameNumber: gamesPerMatch + 1, homeScore: 0, awayScore: 0 }])
    } else if (!isDraw && scores.length > gamesPerMatch) {
      setScores((prev) => prev.slice(0, gamesPerMatch))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoreKey, tiebreakEnabled, gamesPerMatch])

  // Live match score summary (strict 11+2 rule — for display only)
  const regularScores = scores.slice(0, gamesPerMatch)
  const homeWins = regularScores.filter((g) => gameWinner(g.homeScore, g.awayScore) === 'home').length
  const awayWins = regularScores.filter((g) => gameWinner(g.homeScore, g.awayScore) === 'away').length
  const hasTiebreakGame = scores.length > gamesPerMatch
  const tiebreakScore = hasTiebreakGame ? scores[gamesPerMatch] : null
  const tiebreakWinner = tiebreakScore ? gameWinner(tiebreakScore.homeScore, tiebreakScore.awayScore) : null
  const isTie = homeWins === awayWins && homeWins > 0 && tiebreakEnabled && !hasTiebreakGame
  const allComplete = regularScores.every((g) => isGameComplete(g.homeScore, g.awayScore))

  // For submit: use simple > comparison so admin isn't blocked by 11+2 rule
  const homeLeads = regularScores.filter((g) => g.homeScore > g.awayScore).length
  const awayLeads = regularScores.filter((g) => g.awayScore > g.homeScore).length
  const hasDecisiveWinner = Math.max(homeLeads, awayLeads) > gamesPerMatch / 2
  const allScoresEntered = scores.every((g) => g.homeScore > 0 || g.awayScore > 0)
  // If tiebreak game exists, require it to also have a score
  const tiebreakComplete = !hasTiebreakGame || (tiebreakScore !== null && (tiebreakScore.homeScore > 0 || tiebreakScore.awayScore > 0))
  const canSubmit = tiebreakComplete && (allComplete || hasDecisiveWinner || allScoresEntered)

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
    <div className="fixed inset-0 bg-surface flex flex-col z-[60]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
        <button
          onClick={() => router.push(`/manage/${tournamentSlug}/scoring`)}
          className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Back</span>
        </button>
        <div className="text-center">
          <p className="text-xs text-text-muted">Match Score</p>
          <p className="text-sm font-bold text-text-primary">
            {homeTeam.name} <span className="text-brand-500">{homeWins}</span>
            {' – '}
            <span className="text-brand-500">{awayWins}</span> {awayTeam.name}
          </p>
        </div>
        <div className="w-16 text-right">
          {saveStatus === 'saving' && <span className="text-[10px] text-text-muted">Saving…</span>}
          {saveStatus === 'saved' && <span className="text-[10px] text-success">Saved</span>}
          {saveStatus === 'error' && <span className="text-[10px] text-error">Error</span>}
        </div>
      </div>

      {/* Score rows */}
      <div className="flex-1 overflow-y-auto">
        {hasTiebreakGame && (
          <div className="bg-warning-bg border-b border-warning/20 px-4 py-2 text-center">
            <p className="text-warning text-xs font-medium">
              Tied {homeWins}–{awayWins} — enter tiebreak game below
            </p>
          </div>
        )}

        <div className="divide-y divide-border">
          {scores.map((game, i) => {
            const isTiebreakGame = i === gamesPerMatch
            const winner = gameWinner(game.homeScore, game.awayScore)
            return (
              <div key={game.gameNumber} className={['px-4 py-5', isTiebreakGame ? 'bg-warning-bg/30' : ''].join(' ')}>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4 text-center">
                  {isTiebreakGame ? '⚡ Tiebreak Game' : `Game ${game.gameNumber}`}
                  {winner && (
                    <span className="text-success ml-2">
                      — {winner === 'home' ? homeTeam.name : awayTeam.name} wins
                    </span>
                  )}
                </p>

                <div className="flex items-center justify-between gap-4">
                  {/* Home team */}
                  <div className="flex-1 flex flex-col items-center gap-3">
                    <p className="text-xs text-text-secondary text-center truncate w-full">{homeTeam.name}</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adjust(i, 'home', -1)}
                        className="h-10 w-10 rounded-full border-2 border-border flex items-center justify-center text-text-secondary hover:border-brand-500 hover:text-brand-400 active:scale-95 transition-all"
                      >
                        <Minus size={16} />
                      </button>
                      <ScoreInput
                        value={game.homeScore}
                        onChange={(n) => setScore(i, 'home', n)}
                        winner={winner === 'home'}
                      />
                      <button
                        type="button"
                        onClick={() => adjust(i, 'home', 1)}
                        className="h-10 w-10 rounded-full border-2 border-border flex items-center justify-center text-text-secondary hover:border-brand-500 hover:text-brand-400 active:scale-95 transition-all"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  <span className="text-text-muted font-light text-xl self-end pb-2">—</span>

                  {/* Away team */}
                  <div className="flex-1 flex flex-col items-center gap-3">
                    <p className="text-xs text-text-secondary text-center truncate w-full">{awayTeam.name}</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adjust(i, 'away', -1)}
                        className="h-10 w-10 rounded-full border-2 border-border flex items-center justify-center text-text-secondary hover:border-brand-500 hover:text-brand-400 active:scale-95 transition-all"
                      >
                        <Minus size={16} />
                      </button>
                      <ScoreInput
                        value={game.awayScore}
                        onChange={(n) => setScore(i, 'away', n)}
                        winner={winner === 'away'}
                      />
                      <button
                        type="button"
                        onClick={() => adjust(i, 'away', 1)}
                        className="h-10 w-10 rounded-full border-2 border-border flex items-center justify-center text-text-secondary hover:border-brand-500 hover:text-brand-400 active:scale-95 transition-all"
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
      <div className="px-4 py-3 border-t border-border pb-safe shrink-0 space-y-2">
        {!canSubmit && (
          <p className="text-xs text-text-muted text-center">
            {scores.filter((g) => isGameComplete(g.homeScore, g.awayScore)).length} / {gamesPerMatch} games complete
          </p>
        )}
        {hasDecisiveWinner && !allComplete && (
          <p className="text-xs text-text-muted text-center">
            Match decided — {homeWins > awayWins ? homeTeam.name : awayTeam.name} wins {Math.max(homeWins, awayWins)}–{Math.min(homeWins, awayWins)}
          </p>
        )}
        <Button
          onClick={handleSubmit}
          loading={isPending}
          disabled={!canSubmit}
          className="w-full"
          size="lg"
        >
          <Check size={18} />
          {canSubmit ? 'Confirm Result' : 'Enter all game scores to submit'}
        </Button>
      </div>
    </div>
  )
}
