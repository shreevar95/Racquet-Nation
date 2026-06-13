import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding sports and templates...')

  // ── Pickleball ────────────────────────────────────────────────────────────
  const pickleball = await prisma.sport.upsert({
    where: { slug: 'pickleball' },
    update: {},
    create: {
      name: 'Pickleball',
      slug: 'pickleball',
      icon: '🏓',
      isActive: true,
    },
  })
  console.log(`✓ Sport: ${pickleball.name}`)

  const pickleballTemplate = await prisma.sportTemplate.upsert({
    where: { id: 'pickleball-standard' },
    update: {},
    create: {
      id: 'pickleball-standard',
      sportId: pickleball.id,
      name: 'Pickleball Standard',
      isDefault: true,
      description: 'Standard doubles pickleball — rally scoring, first to 21 win by 2',
      scoringConfig: {
        pointsToWin: 21,
        winMargin: 2,
        scoringMethod: 'RALLY',
        serviceRules: 'ONE_SERVE',
        doublesService: 'BOTH_SERVE',
      },
      matchFormat: {
        matchType: 'DOUBLES',
        gamesPerMatch: 4,
        playersPerSide: 2,
        tiebreakEnabled: true,
        tiebreakFormat: 'SINGLE_GAME',
      },
    },
  })
  console.log(`✓ Sport template: ${pickleballTemplate.name}`)

  // ── Racquet Nation Team League default tournament template ─────────────────
  const leagueTemplate = await prisma.tournamentTemplate.upsert({
    where: { id: 'racquet-nation-team-league' },
    update: {},
    create: {
      id: 'racquet-nation-team-league',
      name: 'Racquet Nation Team League',
      sportTemplateId: pickleballTemplate.id,
      isPublic: true,
      structure: {
        numTeams: 9,
        playersPerTeam: 4,
        numGroups: 3,
        format: 'round-robin-groups',
      },
      standingsConfig: {
        criteria: [
          { field: 'matchWins', order: 1, direction: 'DESC' },
          { field: 'gameDifferential', order: 2, direction: 'DESC' },
          { field: 'headToHead', order: 3, direction: 'DESC' },
        ],
        pointsForWin: 3,
        pointsForDraw: 1,
        pointsForLoss: 0,
      },
    },
  })
  console.log(`✓ Tournament template: ${leagueTemplate.name}`)

  // ── Placeholder sports (Coming Soon) ─────────────────────────────────────
  const comingSoonSports = [
    { name: 'Tennis', slug: 'tennis', icon: '🎾' },
    { name: 'Badminton', slug: 'badminton', icon: '🏸' },
    { name: 'Padel', slug: 'padel', icon: '🎾' },
    { name: 'Squash', slug: 'squash', icon: '🟡' },
    { name: 'Table Tennis', slug: 'table-tennis', icon: '🏓' },
  ]

  for (const sport of comingSoonSports) {
    await prisma.sport.upsert({
      where: { slug: sport.slug },
      update: {},
      create: { ...sport, isActive: false },
    })
    console.log(`✓ Sport (coming soon): ${sport.name}`)
  }

  console.log('\nSeed complete ✓')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
