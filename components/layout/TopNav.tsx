'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Show, UserButton } from '@clerk/nextjs'
import { rnButtonVariants } from '@/components/rn/RnButton'
import { cn } from '@/lib/utils'

interface TopNavProps {
  transparent?: boolean
}

const LINKS = [
  { href: '/tournaments', label: 'Tournaments' },
  { href: '/my-teams', label: 'My Teams', authOnly: true },
  { href: '/dashboard', label: 'Dashboard', authOnly: true },
]

export function TopNav({ transparent = false }: TopNavProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b font-nunito',
        transparent
          ? 'border-white/10 bg-transparent'
          : 'border-white/10 bg-ink-deep backdrop-blur-md',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-saffron to-saffron-300 font-nunito text-sm font-black text-white">
            RN
          </span>
          <span className="hidden font-nunito text-sm font-extrabold uppercase tracking-[0.12em] text-white sm:block">
            Racquet Nation
          </span>
        </Link>

        {/* Nav links + auth */}
        <div className="flex items-center gap-1 sm:gap-2">
          {LINKS.filter((l) => !l.authOnly).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'hidden rounded-md px-3 py-1.5 text-sm font-bold transition-colors sm:block',
                isActive(link.href) ? 'text-saffron' : 'text-white/75 hover:text-saffron',
              )}
            >
              {link.label}
            </Link>
          ))}

          <Show when="signed-out">
            <Link
              href="/sign-in"
              className="text-sm font-bold text-white/75 transition-colors hover:text-saffron"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className={cn(rnButtonVariants({ variant: 'primary', size: 'sm' }), 'hidden sm:inline-flex')}
            >
              Join
            </Link>
          </Show>

          <Show when="signed-in">
            {LINKS.filter((l) => l.authOnly).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'hidden rounded-md px-3 py-1.5 text-sm font-bold transition-colors sm:block',
                  isActive(link.href) ? 'text-saffron' : 'text-white/75 hover:text-saffron',
                )}
              >
                {link.label}
              </Link>
            ))}
            <UserButton
              appearance={{
                elements: { avatarBox: 'h-8 w-8 rounded-full ring-2 ring-white/20' },
              }}
            />
          </Show>
        </div>
      </div>
    </header>
  )
}
