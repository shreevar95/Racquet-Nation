import webpush from 'web-push'
import { prisma } from '@/lib/prisma'

export interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

function init() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL ?? 'admin@racquetnation.com'}`,
    pub,
    priv,
  )
  return true
}

export async function pushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!init()) return
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  const body = JSON.stringify(payload)

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        )
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode
        if (status === 410 || status === 404) {
          await prisma.pushSubscription.deleteMany({ where: { id: sub.id } })
        }
      }
    }),
  )
}

export async function pushToTournamentPlayers(
  tournamentId: string,
  payload: PushPayload,
): Promise<void> {
  const regs = await prisma.registration.findMany({
    where: { tournamentId, status: 'APPROVED' },
    select: { player: { select: { userId: true } } },
  })
  await Promise.allSettled(regs.map((r) => pushToUser(r.player.userId, payload)))
}
