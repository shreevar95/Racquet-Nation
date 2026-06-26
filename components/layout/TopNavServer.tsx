import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { TopNav, type DualRole } from './TopNav'

interface Props {
  transparent?: boolean
}

// Server wrapper: TopNav itself is a client component (needs usePathname/state
// for the mobile menu + mode switch), but detecting "is this user both a
// player and an admin/organizer" needs a DB lookup. Done once per layout render
// and passed down as a plain prop.
export async function TopNavServer({ transparent }: Props) {
  const { userId: clerkId } = await auth()
  let dualRole: DualRole | null = null

  if (clerkId) {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        platformRole: true,
        playerProfile: { select: { id: true } },
        tournamentAdmins: {
          select: { tournament: { select: { slug: true } } },
          orderBy: { assignedAt: 'desc' },
          take: 1,
        },
      },
    })

    if (user?.playerProfile) {
      const isPlatformAdmin = user.platformRole === 'PLATFORM_ADMIN'
      const organizerSlug = user.tournamentAdmins[0]?.tournament.slug ?? null

      if (isPlatformAdmin || organizerSlug) {
        dualRole = {
          isPlatformAdmin,
          manageHref: isPlatformAdmin ? '/admin' : `/manage/${organizerSlug}`,
        }
      }
    }
  }

  return <TopNav transparent={transparent} dualRole={dualRole} />
}
