import type { Metadata } from 'next'
import { RnCard } from '@/components/rn/RnCard'

export const metadata: Metadata = { title: 'Platform Admin' }

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6 font-nunito text-ink">
      <h1 className="text-2xl font-black text-ink">Platform Admin</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {['Tournaments', 'Users', 'Sports & Templates'].map((section) => (
          <RnCard key={section} className="p-4">
            <p className="font-bold text-ink">{section}</p>
          </RnCard>
        ))}
      </div>
    </div>
  )
}
