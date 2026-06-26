import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { formatRelativeTime } from '@/lib/utils'
import { Pin } from 'lucide-react'
import { RnCard } from '@/components/rn/RnCard'
import { cn } from '@/lib/utils'

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
      <RnCard className="border-dashed p-8 text-center">
        <p className="text-sm text-rn-text-muted">No announcements yet.</p>
      </RnCard>
    )
  }

  return (
    <div className="space-y-3">
      {announcements.map((a) => (
        <RnCard
          key={a.id}
          className={cn('space-y-2 p-4', a.isPinned && 'border-saffron/30 bg-saffron-tint')}
        >
          <div className="flex items-start gap-2">
            {a.isPinned && <Pin size={14} className="mt-0.5 shrink-0 text-saffron" />}
            <p className="font-nunito font-extrabold text-ink">{a.title}</p>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-rn-text-secondary">
            {a.body}
          </p>
          <p className="text-xs text-rn-text-muted">{formatRelativeTime(a.createdAt)}</p>
        </RnCard>
      ))}
    </div>
  )
}
