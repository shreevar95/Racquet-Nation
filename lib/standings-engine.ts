import type { StandingsConfig } from '@/types/tournament'
import type { StandingsRow } from '@/types/standings'

interface MatchResult {
  homeTeamId: string
  awayTeamId: string
  homeTeamScore: number  // games won
  awayTeamScore: number  // games won
  winnerId: string | null
}

interface TeamInfo {
  id: string
  name: string
  slug: string
  logoUrl: string | null
}

export function computeStandings(
  teams: TeamInfo[],
  completedMatches: MatchResult[],
  config: StandingsConfig,
): StandingsRow[] {
  const map = new Map<string, StandingsRow>()

  // Initialize rows
  for (const team of teams) {
    map.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      teamSlug: team.slug,
      teamLogoUrl: team.logoUrl,
      position: 0,
      matchesPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      matchesDrawn: 0,
      gamesWon: 0,
      gamesLost: 0,
      gameDifferential: 0,
      points: 0,
      qualificationStatus: null,
    })
  }

  // Accumulate stats
  for (const m of completedMatches) {
    const home = map.get(m.homeTeamId)
    const away = map.get(m.awayTeamId)
    if (!home || !away) continue

    home.matchesPlayed++
    away.matchesPlayed++
    home.gamesWon += m.homeTeamScore
    home.gamesLost += m.awayTeamScore
    away.gamesWon += m.awayTeamScore
    away.gamesLost += m.homeTeamScore
    home.gameDifferential = home.gamesWon - home.gamesLost
    away.gameDifferential = away.gamesWon - away.gamesLost

    if (m.winnerId === m.homeTeamId) {
      home.matchesWon++
      home.points += config.pointsForWin
      away.matchesLost++
      away.points += config.pointsForLoss
    } else if (m.winnerId === m.awayTeamId) {
      away.matchesWon++
      away.points += config.pointsForWin
      home.matchesLost++
      home.points += config.pointsForLoss
    } else {
      home.matchesDrawn++
      away.matchesDrawn++
      home.points += config.pointsForDraw
      away.points += config.pointsForDraw
    }
  }

  const rows = Array.from(map.values())

  // Build head-to-head lookup: headToHead[a][b] = points a earned against b
  const h2h: Record<string, Record<string, number>> = {}
  for (const m of completedMatches) {
    h2h[m.homeTeamId] ??= {}
    h2h[m.awayTeamId] ??= {}
    if (m.winnerId === m.homeTeamId) {
      h2h[m.homeTeamId][m.awayTeamId] = (h2h[m.homeTeamId][m.awayTeamId] ?? 0) + config.pointsForWin
      h2h[m.awayTeamId][m.homeTeamId] = (h2h[m.awayTeamId][m.homeTeamId] ?? 0) + config.pointsForLoss
    } else if (m.winnerId === m.awayTeamId) {
      h2h[m.awayTeamId][m.homeTeamId] = (h2h[m.awayTeamId][m.homeTeamId] ?? 0) + config.pointsForWin
      h2h[m.homeTeamId][m.awayTeamId] = (h2h[m.homeTeamId][m.awayTeamId] ?? 0) + config.pointsForLoss
    } else {
      h2h[m.homeTeamId][m.awayTeamId] = (h2h[m.homeTeamId][m.awayTeamId] ?? 0) + config.pointsForDraw
      h2h[m.awayTeamId][m.homeTeamId] = (h2h[m.awayTeamId][m.homeTeamId] ?? 0) + config.pointsForDraw
    }
  }

  // Sort using criteria
  const sortedCriteria = [...config.criteria].sort((a, b) => a.order - b.order)

  rows.sort((a, b) => {
    for (const criterion of sortedCriteria) {
      let diff = 0
      switch (criterion.field) {
        case 'matchWins':
          diff = a.matchesWon - b.matchesWon
          break
        case 'gameDifferential':
          diff = a.gameDifferential - b.gameDifferential
          break
        case 'points':
          diff = a.points - b.points
          break
        case 'headToHead': {
          const aVsB = h2h[a.teamId]?.[b.teamId] ?? 0
          const bVsA = h2h[b.teamId]?.[a.teamId] ?? 0
          diff = aVsB - bVsA
          break
        }
      }
      if (diff !== 0) {
        return criterion.direction === 'DESC' ? -diff : diff
      }
    }
    return 0
  })

  // Assign positions
  rows.forEach((r, i) => { r.position = i + 1 })

  return rows
}
