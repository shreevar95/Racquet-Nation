import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { canManageTournament } from '@/lib/permissions'
import { RnCard } from '@/components/rn/RnCard'
import { ImportForm } from './ImportForm'

interface Props {
  params: Promise<{ tournamentSlug: string }>
}

export const metadata: Metadata = { title: 'Import Players' }

export default async function ImportPage({ params }: Props) {
  const { tournamentSlug } = await params
  const user = await requireAuth()

  const tournament = await prisma.tournament.findUnique({
    where: { slug: tournamentSlug },
    select: { id: true, name: true, slug: true },
  })
  if (!tournament) notFound()
  if (!(await canManageTournament(user.id, tournament.id))) notFound()

  return (
    <div className="max-w-2xl space-y-6 pt-6">
      <div>
        <Link
          href={`/manage/${tournamentSlug}/registrations`}
          className="mb-4 inline-flex items-center gap-1 text-xs text-rn-text-muted transition-colors hover:text-saffron"
        >
          <ChevronLeft size={14} /> Back to Registrations
        </Link>
        <h1 className="font-nunito text-2xl font-black uppercase tracking-wide text-ink">
          Import Players
        </h1>
        <p className="mt-1 text-sm text-rn-text-secondary">
          Upload a Google Forms export (.xlsx or .csv) to bulk-register players into{' '}
          <span className="font-bold text-ink">{tournament.name}</span>.
        </p>
      </div>

      <RnCard className="space-y-2 p-5">
        <p className="text-xs font-extrabold uppercase tracking-wider text-rn-text-muted">How it works</p>
        <ul className="list-inside list-disc space-y-1 text-xs text-rn-text-secondary">
          <li>Export your Google Form responses as a spreadsheet</li>
          <li>Upload it here — email and name columns are required</li>
          <li>Players are added as approved registrations (auto-waitlisted if full)</li>
          <li>If a player later signs up with the same email, their account is linked automatically</li>
        </ul>
      </RnCard>

      <ImportForm tournamentId={tournament.id} tournamentSlug={tournamentSlug} />
    </div>
  )
}
