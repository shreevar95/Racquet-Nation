import type { Metadata } from 'next'
import Link from 'next/link'
import { RnCard } from '@/components/rn/RnCard'

export const metadata: Metadata = { title: 'Platform Admin' }

const SECTIONS = [
  { label: 'Tournaments', href: '/admin/tournaments' },
  { label: 'Users', href: null },
  { label: 'Sports & Templates', href: null },
]

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6 font-nunito text-ink">
      <h1 className="text-2xl font-black text-ink">Platform Admin</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) =>
          section.href ? (
            <Link key={section.label} href={section.href}>
              <RnCard className="rn-card-hover p-4">
                <p className="font-bold text-ink">{section.label}</p>
              </RnCard>
            </Link>
          ) : (
            <RnCard key={section.label} className="p-4 opacity-60">
              <p className="font-bold text-ink">{section.label}</p>
              <p className="mt-0.5 text-xs text-rn-text-muted">Coming soon</p>
            </RnCard>
          ),
        )}
      </div>
    </div>
  )
}
