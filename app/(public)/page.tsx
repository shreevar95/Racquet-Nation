import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { MarketingNav } from '@/components/marketing/MarketingNav'
import { MarketingHero } from '@/components/marketing/MarketingHero'
import { MarketingStatsBand } from '@/components/marketing/MarketingStatsBand'
import { MarketingHowToPlay } from '@/components/marketing/MarketingHowToPlay'
import { MarketingMiniLeagues } from '@/components/marketing/MarketingMiniLeagues'
import { MarketingPlayerCards } from '@/components/marketing/MarketingPlayerCards'
import { MarketingLiveScoring } from '@/components/marketing/MarketingLiveScoring'
import { MarketingSports } from '@/components/marketing/MarketingSports'
import { MarketingFinalCta } from '@/components/marketing/MarketingFinalCta'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'

export const metadata: Metadata = {
  title: 'Racquet Nation — Play. Compete. Win.',
  description:
    "India's premier tournament and league platform for racquet sports. Live scores, standings, team lineups, and more.",
}

export const revalidate = 3600

export default async function HomePage() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  const [managerCount, teamCount, tournamentCount, sportCount] = await Promise.all([
    prisma.user.count(),
    prisma.team.count(),
    prisma.tournament.count({ where: { isPublic: true, status: { not: 'ARCHIVED' } } }),
    prisma.sport.count({ where: { isActive: true } }),
  ])

  return (
    <div className="bg-paper font-nunito text-ink">
      <MarketingNav />
      <MarketingHero />
      <MarketingStatsBand
        managerCount={managerCount}
        teamCount={teamCount}
        tournamentCount={tournamentCount}
        sportCount={sportCount}
      />
      <MarketingHowToPlay />
      <MarketingMiniLeagues />
      <MarketingPlayerCards />
      <MarketingLiveScoring />
      <MarketingSports />
      <MarketingFinalCta />
      <MarketingFooter />
    </div>
  )
}
