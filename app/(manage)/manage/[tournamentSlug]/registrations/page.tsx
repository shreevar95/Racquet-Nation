import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { canApproveRegistrations } from '@/lib/permissions'
import { RnCard } from '@/components/rn/RnCard'
import { RnTeamTile } from '@/components/rn/RnTeamTile'
import { rnButtonVariants } from '@/components/rn/RnButton'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { RegistrationActions } from './RegistrationActions'
import { RemovePlayerButton } from './RemovePlayerButton'

interface Props {
  params: Promise<{ tournamentSlug: string }>
}

export const metadata: Metadata = { title: 'Registrations' }

export default async function RegistrationsPage({ params }: Props) {
  const { tournamentSlug } = await params
  const user = await requireAuth()

  const tournament = await prisma.tournament.findUnique({
    where: { slug: tournamentSlug },
    select: { id: true, name: true, slug: true, maxPlayers: true },
  })
  if (!tournament) notFound()
  if (!(await canApproveRegistrations(user.id, tournament.id))) notFound()

  const registrations = await prisma.registration.findMany({
    where: { tournamentId: tournament.id },
    include: {
      player: {
        include: {
          user: { select: { name: true, email: true, avatarUrl: true } },
        },
      },
    },
    orderBy: { appliedAt: 'asc' },
  })

  const byStatus = {
    APPLIED: registrations.filter((r) => r.status === 'APPLIED'),
    APPROVED: registrations.filter((r) => r.status === 'APPROVED'),
    WAITLISTED: registrations.filter((r) => r.status === 'WAITLISTED'),
    REJECTED: registrations.filter((r) => r.status === 'REJECTED'),
  }

  return (
    <div className="space-y-6 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-nunito text-xl font-black text-ink">Registrations</h1>
          <p className="text-sm text-rn-text-secondary">{tournament.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('text-xs font-bold', byStatus.APPROVED.length > tournament.maxPlayers ? 'text-red-down' : 'text-rn-text-muted')}>
            {byStatus.APPROVED.length} / {tournament.maxPlayers} approved
          </span>
          <Link
            href={`/manage/${tournamentSlug}/registrations/import`}
            className={rnButtonVariants({ variant: 'secondary', size: 'sm' })}
          >
            Import from Excel
          </Link>
        </div>
      </div>

      {/* Over-capacity alert */}
      {byStatus.APPROVED.length > tournament.maxPlayers && (
        <RnCard className="flex items-start gap-3 border-red-down/30 bg-red-down/10 px-4 py-3">
          <span className="mt-0.5 text-base leading-none text-red-down">⚠</span>
          <div>
            <p className="text-sm font-extrabold text-red-down">Over capacity</p>
            <p className="mt-0.5 text-xs text-red-down/80">
              {byStatus.APPROVED.length} players approved but the tournament limit is {tournament.maxPlayers}.
              Move {byStatus.APPROVED.length - tournament.maxPlayers} player{byStatus.APPROVED.length - tournament.maxPlayers > 1 ? 's' : ''} to the waitlist.
            </p>
          </div>
        </RnCard>
      )}

      {/* Pending */}
      {byStatus.APPLIED.length > 0 && (
        <Section title="Pending Review">
          {byStatus.APPLIED.map((reg) => (
            <RegistrationRow key={reg.id} reg={reg} showActions />
          ))}
        </Section>
      )}

      {/* Approved */}
      {byStatus.APPROVED.length > 0 && (
        <Section title="Approved">
          {byStatus.APPROVED.map((reg) => (
            <RegistrationRow key={reg.id} reg={reg} showWaitlist showRemove />
          ))}
        </Section>
      )}

      {/* Waitlisted */}
      {byStatus.WAITLISTED.length > 0 && (
        <Section title="Waitlisted">
          {byStatus.WAITLISTED.map((reg) => (
            <RegistrationRow key={reg.id} reg={reg} showApprove />
          ))}
        </Section>
      )}

      {/* Rejected */}
      {byStatus.REJECTED.length > 0 && (
        <Section title="Rejected">
          {byStatus.REJECTED.map((reg) => (
            <RegistrationRow key={reg.id} reg={reg} showWaitlist />
          ))}
        </Section>
      )}

      {registrations.length === 0 && (
        <RnCard className="border-dashed p-8 text-center">
          <p className="text-sm text-rn-text-muted">No registrations yet.</p>
        </RnCard>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-extrabold uppercase tracking-wider text-rn-text-muted">{title}</p>
      {children}
    </div>
  )
}

type RegWithPlayer = Awaited<
  ReturnType<typeof prisma.registration.findMany>
>[number] & {
  player: { user: { name: string; email: string; avatarUrl: string | null } }
}

const STATUS_STYLE: Record<string, string> = {
  APPLIED: 'bg-rn-blue/10 text-rn-blue',
  APPROVED: 'bg-rn-green/10 text-rn-green',
  WAITLISTED: 'bg-rn-yellow/20 text-ink',
  REJECTED: 'bg-red-down/10 text-red-down',
}

function RegistrationRow({
  reg,
  showActions,
  showApprove,
  showWaitlist,
  showRemove,
}: {
  reg: RegWithPlayer
  showActions?: boolean
  showApprove?: boolean
  showWaitlist?: boolean
  showRemove?: boolean
}) {
  return (
    <RnCard className="flex items-center gap-3 p-3">
      <RnTeamTile name={reg.player.user.name} logoUrl={reg.player.user.avatarUrl} color="#19A463" size="sm" className="rounded-full" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{reg.player.user.name}</p>
        <p className="text-xs text-rn-text-muted">{formatDate(reg.appliedAt)}</p>
      </div>
      <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide', STATUS_STYLE[reg.status] ?? 'bg-rn-text-muted/10 text-rn-text-muted')}>
        {reg.status}
      </span>
      {showActions && <RegistrationActions registrationId={reg.id} />}
      {showApprove && <RegistrationActions registrationId={reg.id} approveOnly />}
      {showWaitlist && <RegistrationActions registrationId={reg.id} waitlistOnly />}
      {showRemove && (
        <RemovePlayerButton registrationId={reg.id} playerName={reg.player.user.name} />
      )}
    </RnCard>
  )
}
