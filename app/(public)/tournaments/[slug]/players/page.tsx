import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Avatar } from '@/components/ui/avatar'

interface Props {
  params: Promise<{ slug: string }>
}

export const metadata: Metadata = { title: 'Players' }
export const revalidate = 300

export default async function PublicPlayersPage({ params }: Props) {
  const { slug } = await params
  const tournament = await prisma.tournament.findUnique({
    where: { slug, isPublic: true },
    select: { id: true },
  })
  if (!tournament) notFound()

  const registrations = await prisma.registration.findMany({
    where: { tournamentId: tournament.id, status: 'APPROVED' },
    include: {
      player: {
        include: {
          user: { select: { name: true, avatarUrl: true } },
          teamMemberships: {
            where: { team: { tournamentId: tournament.id } },
            include: { team: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { player: { user: { name: 'asc' } } },
  })

  if (registrations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-text-muted text-sm">No players registered yet.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {registrations.map((reg) => {
        const teamName = reg.player.teamMemberships[0]?.team.name
        return (
          <Link
            key={reg.id}
            href={`/players/${reg.player.slug}`}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised p-3 hover:border-brand-500/40 transition-colors"
          >
            <Avatar src={reg.player.user.avatarUrl} name={reg.player.user.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{reg.player.user.name}</p>
              {teamName && <p className="text-xs text-text-muted">{teamName}</p>}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
