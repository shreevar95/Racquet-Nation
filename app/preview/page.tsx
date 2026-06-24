import type { Metadata } from 'next'
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
  title: 'Design preview',
  robots: { index: false, follow: false },
}

export default function PreviewPage() {
  return (
    <div className="min-h-screen bg-paper font-nunito text-ink">
      <MarketingNav />
      <MarketingHero />
      <MarketingStatsBand />
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
