import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { TournamentWizard } from '@/components/admin/wizard/TournamentWizard'

export const metadata: Metadata = { title: 'New Tournament' }

export default async function NewTournamentPage() {
  const sports = await prisma.sport.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true },
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Create Tournament</h1>
        <p className="text-text-secondary text-sm mt-1">
          Set up a new tournament in 6 steps.
        </p>
      </div>
      <TournamentWizard sports={sports} />
    </div>
  )
}
