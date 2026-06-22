import { z } from 'zod'

export const ScoringConfigSchema = z.object({
  pointsToWin: z.number().int().min(1),
  winMargin: z.number().int().min(1),
  scoringMethod: z.enum(['RALLY', 'SIDE_OUT']),
  serviceRules: z.enum(['ONE_SERVE', 'TWO_SERVES']),
  doublesService: z.enum(['BOTH_SERVE', 'ALTERNATING']).optional(),
})

export const MatchFormatSchema = z.object({
  matchType: z.enum(['SINGLES', 'DOUBLES', 'MIXED_DOUBLES']),
  gamesPerMatch: z.number().int().min(1).max(9),
  playersPerSide: z.number().int().min(1).max(2),
  tiebreakEnabled: z.boolean(),
  tiebreakFormat: z.enum(['SINGLE_GAME', 'BEST_OF_3']).optional(),
  gameTypes: z.record(z.string(), z.string()).optional(),
  tournamentStructure: z.enum(['GROUP_STAGE_ONLY', 'KNOCKOUT_ONLY', 'GROUP_STAGE_PLUS_KNOCKOUT']).default('GROUP_STAGE_ONLY'),
  knockoutType: z.enum(['ROUND_ROBIN', 'BRACKET']).default('ROUND_ROBIN'),
  knockoutGamesPerMatch: z.number().int().min(1).max(9).optional(),
  knockoutPointsToWin: z.number().int().min(1).optional(),
  teamsAdvancePerGroup: z.number().int().min(1).optional(),
})

export const StandingsConfigSchema = z.object({
  criteria: z.array(
    z.object({
      field: z.enum(['matchWins', 'gameDifferential', 'headToHead', 'points']),
      order: z.number().int().min(1),
      direction: z.enum(['ASC', 'DESC']),
    }),
  ),
  pointsForWin: z.number().int().min(0),
  pointsForDraw: z.number().int().min(0),
  pointsForLoss: z.number().int().min(0),
})

export const RegistrationConfigSchema = z.object({
  requirePhone: z.boolean().default(false),
  requireDateOfBirth: z.boolean().default(false),
  requireGender: z.boolean().default(false),
  requireRating: z.boolean().default(false),
  customFields: z
    .array(
      z.object({
        key: z.string(),
        label: z.string(),
        type: z.enum(['text', 'number', 'select', 'checkbox']),
        required: z.boolean(),
        options: z.array(z.string()).optional(),
      }),
    )
    .default([]),
  maxRegistrations: z.number().int().min(1).optional(),
  deadline: z.string().optional(),
})

export const TiebreakConfigSchema = z.object({
  pointsToWin: z.number().int().min(1).default(11),
  winMargin: z.number().int().min(1).default(2),
  capAt: z.number().int().optional(),
})

export const CreateTournamentSchema = z.object({
  // Step 1 — Basics
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  sportId: z.string().min(1, 'Select a sport'),
  startDate: z.string().min(1, 'Start date required'),
  endDate: z.string().min(1, 'End date required'),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  venue: z.string().min(2, 'Venue required').max(150),
  venueAddress: z.string().max(300).optional().nullable(),
  timezone: z.string().default('Asia/Kolkata'),
  description: z.string().max(2000).optional().nullable(),
  visibility: z.enum(['PUBLIC', 'UNLISTED', 'INVITE_ONLY']).default('PUBLIC'),
  registrationCode: z.string().max(50).optional().nullable(),
  // Step 2 — Structure
  numTeams: z.coerce.number().int().min(2).max(64),
  playersPerTeam: z.coerce.number().int().min(1).max(20),
  numGroups: z.coerce.number().int().min(1).max(16),
  // Step 3 — Match Format
  matchFormat: MatchFormatSchema,
  scoringConfig: ScoringConfigSchema,
  // Step 4 — Registration
  registrationConfig: RegistrationConfigSchema,
  // Step 5 — Standings
  standingsConfig: StandingsConfigSchema,
  tiebreakConfig: TiebreakConfigSchema,
  // Branding (optional)
  logoUrl: z.string().url().optional().nullable(),
  bannerUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
})

export type CreateTournamentInput = z.infer<typeof CreateTournamentSchema>
export type ScoringConfig = z.infer<typeof ScoringConfigSchema>
export type MatchFormat = z.infer<typeof MatchFormatSchema>
export type StandingsConfig = z.infer<typeof StandingsConfigSchema>
export type RegistrationConfig = z.infer<typeof RegistrationConfigSchema>
export type TiebreakConfig = z.infer<typeof TiebreakConfigSchema>
