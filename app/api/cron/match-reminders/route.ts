import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pushToUser } from '@/lib/push'

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const now = new Date()
  const in45 = new Date(now.getTime() + 45 * 60_000)
  const in75 = new Date(now.getTime() + 75 * 60_000)

  // Matches starting in the next 45–75 minutes (cron runs every 30 min)
  const matches = await prisma.match.findMany({
    where: { status: 'UPCOMING', scheduledAt: { gte: in45, lte: in75 } },
    include: {
      homeTeam: { include: { memberships: { include: { player: { select: { userId: true } } } } } },
      awayTeam: { include: { memberships: { include: { player: { select: { userId: true } } } } } },
      tournament: { select: { name: true, slug: true } },
    },
  })

  let sent = 0
  for (const match of matches) {
    const time = match.scheduledAt?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    const payload = {
      title: 'Your match is coming up!',
      body: `${match.homeTeam.name} vs ${match.awayTeam.name} — ${time ?? 'soon'}${match.court ? ` on Court ${match.court}` : ''}`,
      url: `/tournaments/${match.tournament.slug}/schedule`,
      tag: `match-reminder-${match.id}`,
    }
    const players = [...match.homeTeam.memberships, ...match.awayTeam.memberships]
    for (const m of players) {
      await pushToUser(m.player.userId, payload)
      sent++
    }
  }

  return NextResponse.json({ matched: matches.length, notified: sent })
}
