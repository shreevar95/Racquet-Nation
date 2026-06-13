import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { canManageTournament } from '@/lib/permissions'
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
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href={`/manage/${tournamentSlug}/registrations`}
          className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors mb-4"
        >
          <ChevronLeft size={14} /> Back to Registrations
        </Link>
        <h1 className="font-display font-black text-2xl uppercase text-text-primary tracking-wide">
          Import Players
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Upload a Google Forms export (.xlsx or .csv) to bulk-register players into{' '}
          <span className="text-text-primary font-medium">{tournament.name}</span>.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface-raised p-5 space-y-2">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">How it works</p>
        <ul className="text-xs text-text-secondary space-y-1 list-disc list-inside">
          <li>Export your Google Form responses as a spreadsheet</li>
          <li>Upload it here — email and name columns are required</li>
          <li>Players are added as approved registrations (auto-waitlisted if full)</li>
          <li>If a player later signs up with the same email, their account is linked automatically</li>
        </ul>
      </div>

      <ImportForm tournamentId={tournament.id} tournamentSlug={tournamentSlug} />
    </div>
  )
}
