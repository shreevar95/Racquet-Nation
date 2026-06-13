export const GAME_TYPE_CONFIG: Record<string, { label: string; playersPerSide: number }> = {
  MENS_SINGLES:    { label: "Men's Singles",    playersPerSide: 1 },
  WOMENS_SINGLES:  { label: "Women's Singles",  playersPerSide: 1 },
  MENS_DOUBLES:    { label: "Men's Doubles",    playersPerSide: 2 },
  WOMENS_DOUBLES:  { label: "Women's Doubles",  playersPerSide: 2 },
  MIXED_DOUBLES:   { label: "Mixed Doubles",    playersPerSide: 2 },
  KIDS:            { label: "Kids",             playersPerSide: 2 },
}

export const GAME_TYPE_OPTIONS = Object.entries(GAME_TYPE_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
  playersPerSide: cfg.playersPerSide,
}))

export function getPlayersPerSide(gameType: string | undefined, fallback: number): number {
  if (!gameType) return fallback
  return GAME_TYPE_CONFIG[gameType]?.playersPerSide ?? fallback
}

export function getGameTypeLabel(gameType: string | undefined): string | null {
  if (!gameType) return null
  return GAME_TYPE_CONFIG[gameType]?.label ?? null
}
