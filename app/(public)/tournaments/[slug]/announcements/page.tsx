import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { formatRelativeTime } from '@/lib/utils'
import { Pin } from 'lucide-react'

interface Props {
  params: Promise<{ slug: string }>
}

export const metadata: Metadata = { title: 'Announcements' }
export const revalidate = 60

export default async function AnnouncementsPage({ params }: Props) {
  const { slug } = await params
  const tournament = await prisma.tournament.findUnique({
    where: { slug, isPublic: true },
    select: { id: true },
  })
  if (!tournament) notFound()

  const announcements = await prisma.announcement.findMany({
    where: { tournamentId: tournament.id, isPublished: true },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
  })

  if (announcements.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-text-muted text-sm">No announcements yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {announcements.map((a) => (
        <div
          key={a.id}
          className={[
            'rounded-lg border p-4 space-y-2',
            a.isPinned
              ? 'border-brand-500/30 bg-brand-500/5'
              : 'border-border bg-surface-raised',
          ].join(' ')}
        >
          <div className="flex items-start gap-2">
            {a.isPinned && <Pin size={14} className="text-brand-400 shrink-0 mt-0.5" />}
            <p className="font-semibold text-text-primary">{a.title}</p>
          </div>
          <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
            {a.body}
          </p>
          <p className="text-xs text-text-muted">{formatRelativeTime(a.createdAt)}</p>
        </div>
      ))}
    </div>
  )
}
