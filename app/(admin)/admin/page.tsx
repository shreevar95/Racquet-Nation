import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Platform Admin' }

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Platform Admin</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {['Tournaments', 'Users', 'Sports & Templates'].map((section) => (
          <div
            key={section}
            className="rounded-lg border border-border bg-surface-raised p-4"
          >
            <p className="font-medium text-text-primary">{section}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
