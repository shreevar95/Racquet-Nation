import type { Metadata } from 'next'
import { MarketingNav } from '@/components/marketing/MarketingNav'
import { MarketingHero } from '@/components/marketing/MarketingHero'

export const metadata: Metadata = {
  title: 'Design preview',
  robots: { index: false, follow: false },
}

export default function PreviewPage() {
  return (
    <div className="bg-paper font-nunito text-ink">
      <MarketingNav />
      <MarketingHero />
    </div>
  )
}
