import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { RegistrationForm } from './RegistrationForm'
import { formatDate } from '@/lib/utils'

interface Props {
  params: Promise<{ tournamentSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tournamentSlug } = await params
  const tournament = await prisma.tournament.findUnique({
    where: { slug: tournamentSlug },
    select: { name: true },
  })
  return { title: tournament ? `Register — ${tournament.name}` : 'Register' }
}

export default async function RegisterPage({ params }: Props) {
  const { tournamentSlug } = await params
  const user = await requireAuth()

  const tournament = await prisma.tournament.findUnique({
    where: { slug: tournamentSlug },
    select: {
      id: true,
      name: true,
      status: true,
      visibility: true,
      registrationConfig: true,
      startDate: true,
      venue: true,
      maxPlayers: true,
      sport: { select: { name: true } },
    },
  })
  if (!tournament) notFound()
  if (tournament.status !== 'REGISTRATION_OPEN') {
    redirect(`/tournaments/${tournamentSlug}`)
  }

  if (user.playerProfile) {
    const existing = await prisma.registration.findUnique({
      where: {
        tournamentId_playerId: {
          tournamentId: tournament.id,
          playerId: user.playerProfile.id,
        },
      },
    })
    if (existing) redirect(`/tournaments/${tournamentSlug}?already_registered=1`)
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 space-y-8">

      {/* Page header */}
      <div className="border-b border-border pb-6">
        <p className="text-brand-500 text-xs font-bold tracking-[0.2em] uppercase font-display mb-2">
          {tournament.sport.name} · Registration Open
        </p>
        <h1 className="font-display font-black text-3xl sm:text-4xl uppercase text-text-primary leading-tight">
          {tournament.name}
        </h1>
        <p className="text-text-secondary text-sm mt-2">
          {tournament.venue} · Starts {formatDate(tournament.startDate)}
        </p>
      </div>

      {/* Info callout */}
      <div className="rounded-lg border border-border bg-surface-raised p-4 flex gap-3">
        <div className="shrink-0 mt-0.5">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-brand-500">
            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-sm text-text-secondary">
          {tournament.visibility === 'INVITE_ONLY'
            ? 'This is an invite-only tournament. Enter your registration code to secure your spot.'
            : `Spots are filled on a first-come basis up to the ${tournament.maxPlayers}-player limit. Register now to guarantee your place.`}
        </p>
      </div>

      <RegistrationForm
        tournamentId={tournament.id}
        registrationConfig={tournament.registrationConfig as Record<string, unknown>}
        requiresCode={tournament.visibility === 'INVITE_ONLY'}
        user={user}
      />
    </div>
  )
}
