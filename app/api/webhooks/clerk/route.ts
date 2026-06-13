import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { prisma } from '@/lib/prisma'
import { generatePlayerSlug } from '@/lib/slug'

interface ClerkEmailAddress {
  email_address: string
  id: string
}

interface ClerkUserPayload {
  id: string
  email_addresses: ClerkEmailAddress[]
  first_name: string | null
  last_name: string | null
  image_url: string | null
  phone_numbers: Array<{ phone_number: string }>
}

interface WebhookEvent {
  type: string
  data: ClerkUserPayload
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'No webhook secret' }, { status: 500 })
  }

  // Verify svix signature
  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const payload = await req.text()
  const wh = new Webhook(WEBHOOK_SECRET)

  let event: WebhookEvent
  try {
    event = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const { type, data } = event

  if (type === 'user.created' || type === 'user.updated') {
    const email = data.email_addresses[0]?.email_address ?? ''
    const name =
      [data.first_name, data.last_name].filter(Boolean).join(' ').trim() || email

    if (type === 'user.created') {
      // Check if an imported user already exists with this email — claim their account
      const imported = await prisma.user.findFirst({
        where: { email, isImported: true, clerkId: null },
      })
      if (imported) {
        await prisma.user.update({
          where: { id: imported.id },
          data: { clerkId: data.id, name, avatarUrl: data.image_url, isImported: false },
        })
      } else {
        const slug = await generatePlayerSlug(name, data.id)
        await prisma.user.upsert({
          where: { clerkId: data.id },
          update: { name, email, avatarUrl: data.image_url },
          create: {
            clerkId: data.id,
            email,
            name,
            avatarUrl: data.image_url,
            playerProfile: { create: { slug } },
          },
        })
      }
    } else {
      await prisma.user.updateMany({
        where: { clerkId: data.id },
        data: { name, email, avatarUrl: data.image_url },
      })
    }
  }

  if (type === 'user.deleted') {
    // Cascade delete handles PlayerProfile, Notifications, etc.
    await prisma.user.deleteMany({ where: { clerkId: data.id } })
  }

  return NextResponse.json({ received: true })
}
