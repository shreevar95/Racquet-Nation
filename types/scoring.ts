export interface GameScore {
  gameNumber: number
  homeScore: number
  awayScore: number
}

export interface MatchResult {
  homeTeamScore: number
  awayTeamScore: number
  winnerId: string | null
  isTiebreak: boolean
  games: GameScore[]
}
