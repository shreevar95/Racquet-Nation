'use server'

import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface SubscriptionInput {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export async function subscribeToPush(
  sub: SubscriptionInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuth()
    await prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId: user.id, endpoint: sub.endpoint } },
      update: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      create: {
        userId: user.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
    })
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to save subscription' }
  }
}

export async function unsubscribeFromPush(
  endpoint: string,
): Promise<{ success: boolean }> {
  try {
    const user = await requireAuth()
    await prisma.pushSubscription.deleteMany({ where: { userId: user.id, endpoint } })
    return { success: true }
  } catch {
    return { success: false }
  }
}
