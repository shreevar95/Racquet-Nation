import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { canManageTournament } from '@/lib/permissions'
import { TournamentWizard } from '@/components/admin/wizard/TournamentWizard'
import type { CreateTournamentInput } from '@/types/tournament'

interface Props {
  params: Promise<{ tournamentSlug: string }>
}

export const metadata: Metadata = { title: 'Settings' }

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function toTimeStr(d: Date): string | null {
  const time = d.toISOString().slice(11, 16)
  return time === '00:00' ? null : time
}

export default async function SettingsPage({ params }: Props) {
  const { tournamentSlug } = await params
  const user = await requireAuth()

  const [tournament, sports] = await Promise.all([
    prisma.tournament.findUnique({
      where: { slug: tournamentSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        sportId: true,
        startDate: true,
        endDate: true,
        venue: true,
        venueAddress: true,
        timezone: true,
        description: true,
        visibility: true,
        registrationCode: true,
        numTeams: true,
        playersPerTeam: true,
        numGroups: true,
        matchFormat: true,
        scoringConfig: true,
        standingsConfig: true,
        tiebreakConfig: true,
        registrationConfig: true,
        logoUrl: true,
        bannerUrl: true,
        primaryColor: true,
        secondaryColor: true,
      },
    }),
    prisma.sport.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: 'asc' } }),
  ])

  if (!tournament) notFound()
  if (!(await canManageTournament(user.id, tournament.id))) notFound()

  const initialData: CreateTournamentInput = {
    name: tournament.name,
    sportId: tournament.sportId,
    startDate: toDateStr(tournament.startDate),
    endDate: toDateStr(tournament.endDate),
    startTime: toTimeStr(tournament.startDate),
    endTime: toTimeStr(tournament.endDate),
    venue: tournament.venue,
    venueAddress: tournament.venueAddress ?? null,
    timezone: tournament.timezone,
    description: tournament.description ?? null,
    visibility: tournament.visibility as 'PUBLIC' | 'UNLISTED' | 'INVITE_ONLY',
    registrationCode: tournament.registrationCode ?? null,
    numTeams: tournament.numTeams,
    playersPerTeam: tournament.playersPerTeam,
    numGroups: tournament.numGroups,
    matchFormat: tournament.matchFormat as unknown as CreateTournamentInput['matchFormat'],
    scoringConfig: tournament.scoringConfig as unknown as CreateTournamentInput['scoringConfig'],
    standingsConfig: tournament.standingsConfig as unknown as CreateTournamentInput['standingsConfig'],
    tiebreakConfig: tournament.tiebreakConfig as unknown as CreateTournamentInput['tiebreakConfig'],
    registrationConfig: tournament.registrationConfig as unknown as CreateTournamentInput['registrationConfig'],
    logoUrl: tournament.logoUrl ?? null,
    bannerUrl: tournament.bannerUrl ?? null,
    primaryColor: tournament.primaryColor ?? null,
    secondaryColor: tournament.secondaryColor ?? null,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Tournament Settings</h1>
        <p className="text-sm text-text-secondary mt-1">Edit all tournament details, format, and rules.</p>
      </div>
      <TournamentWizard
        sports={sports}
        mode="edit"
        tournamentId={tournament.id}
        tournamentSlug={tournament.slug}
        initialData={initialData}
      />
    </div>
  )
}
