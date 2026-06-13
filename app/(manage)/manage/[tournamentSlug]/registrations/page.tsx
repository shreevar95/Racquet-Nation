import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { canApproveRegistrations } from '@/lib/permissions'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Registrations</h1>
          <p className="text-sm text-text-secondary">{tournament.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium ${byStatus.APPROVED.length > tournament.maxPlayers ? 'text-red-400' : 'text-text-muted'}`}>
            {byStatus.APPROVED.length} / {tournament.maxPlayers} approved
          </span>
          <Link href={`/manage/${tournamentSlug}/registrations/import`}>
            <Button size="sm" variant="ghost" className="text-xs gap-1.5 border border-border hover:border-brand-500/50">
              Import from Excel
            </Button>
          </Link>
        </div>
      </div>

      {/* Over-capacity alert */}
      {byStatus.APPROVED.length > tournament.maxPlayers && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <span className="text-red-400 text-base leading-none mt-0.5">⚠</span>
          <div>
            <p className="text-sm font-semibold text-red-400">Over capacity</p>
            <p className="text-xs text-red-300/80 mt-0.5">
              {byStatus.APPROVED.length} players approved but the tournament limit is {tournament.maxPlayers}.
              Move {byStatus.APPROVED.length - tournament.maxPlayers} player{byStatus.APPROVED.length - tournament.maxPlayers > 1 ? 's' : ''} to the waitlist.
            </p>
          </div>
        </div>
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
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-text-muted text-sm">No registrations yet.</p>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">{title}</p>
      {children}
    </div>
  )
}

type RegWithPlayer = Awaited<
  ReturnType<typeof prisma.registration.findMany>
>[number] & {
  player: { user: { name: string; email: string; avatarUrl: string | null } }
}

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  APPLIED: 'info',
  APPROVED: 'success',
  WAITLISTED: 'warning',
  REJECTED: 'error',
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
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised p-3">
      <Avatar src={reg.player.user.avatarUrl} name={reg.player.user.name} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{reg.player.user.name}</p>
        <p className="text-xs text-text-muted">{formatDate(reg.appliedAt)}</p>
      </div>
      <Badge variant={STATUS_BADGE[reg.status] ?? 'default'} dot>
        {reg.status}
      </Badge>
      {showActions && <RegistrationActions registrationId={reg.id} />}
      {showApprove && <RegistrationActions registrationId={reg.id} approveOnly />}
      {showWaitlist && <RegistrationActions registrationId={reg.id} waitlistOnly />}
      {showRemove && (
        <RemovePlayerButton registrationId={reg.id} playerName={reg.player.user.name} />
      )}
    </div>
  )
}
