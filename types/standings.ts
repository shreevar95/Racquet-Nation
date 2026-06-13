export interface StandingsRow {
  teamId: string
  teamName: string
  teamSlug: string
  teamLogoUrl: string | null
  position: number
  matchesPlayed: number
  matchesWon: number
  matchesLost: number
  matchesDrawn: number
  gamesWon: number
  gamesLost: number
  gameDifferential: number
  points: number
  qualificationStatus: string | null
}
