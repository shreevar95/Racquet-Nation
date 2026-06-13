import { prisma } from '@/lib/prisma'

function toBase(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60) || 'item'
}

export async function generateTournamentSlug(name: string): Promise<string> {
  const base = toBase(name)
  const existing = await prisma.tournament.findUnique({ where: { slug: base } })
  if (!existing) return base
  return await findUniqueSlug(base, (s) => prisma.tournament.findUnique({ where: { slug: s } }))
}

export async function generateTeamSlug(tournamentId: string, name: string): Promise<string> {
  const base = toBase(name)
  const existing = await prisma.team.findFirst({ where: { tournamentId, slug: base } })
  if (!existing) return base
  return await findUniqueSlug(base, (s) =>
    prisma.team.findFirst({ where: { tournamentId, slug: s } }),
  )
}

export async function generateMatchSlug(
  homeTeamName: string,
  awayTeamName: string,
  round?: number,
): Promise<string> {
  const base = toBase(
    `${homeTeamName}-vs-${awayTeamName}${round ? `-r${round}` : ''}`,
  )
  const existing = await prisma.match.findUnique({ where: { slug: base } })
  if (!existing) return base
  return await findUniqueSlug(base, (s) => prisma.match.findUnique({ where: { slug: s } }))
}

export async function generatePlayerSlug(name: string, clerkIdSuffix: string): Promise<string> {
  const base = toBase(name) || 'player'
  const slug = `${base}-${clerkIdSuffix.slice(-4)}`
  const existing = await prisma.playerProfile.findUnique({ where: { slug } })
  if (!existing) return slug
  return `${base}-${clerkIdSuffix.slice(-8)}`
}

async function findUniqueSlug(
  base: string,
  checker: (slug: string) => Promise<unknown>,
): Promise<string> {
  let counter = 2
  while (counter < 100) {
    const candidate = `${base}-${counter}`
    const found = await checker(candidate)
    if (!found) return candidate
    counter++
  }
  return `${base}-${Date.now()}`
}
