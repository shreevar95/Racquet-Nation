'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Show, UserButton } from '@clerk/nextjs'
import { Menu, X } from 'lucide-react'
import { rnButtonVariants } from '@/components/rn/RnButton'
import { cn } from '@/lib/utils'

export interface DualRole {
  isPlatformAdmin: boolean
  manageHref: string
}

interface TopNavProps {
  transparent?: boolean
  dualRole?: DualRole | null
}

type Mode = 'player' | 'admin'

const MODE_STORAGE_KEY = 'rn-nav-mode'

const PLAYER_LINKS = [
  { href: '/tournaments', label: 'Tournaments' },
  { href: '/my-teams', label: 'My Teams', authOnly: true },
  { href: '/dashboard', label: 'Dashboard', authOnly: true },
]

export function TopNav({ transparent = false, dualRole = null }: TopNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('player')
  const [modeReady, setModeReady] = useState(false)

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // Figure out the starting mode: stored preference, else infer from the
  // current route, else default to player. Only matters for dual-role users.
  useEffect(() => {
    if (!dualRole) return
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(MODE_STORAGE_KEY) : null
    if (stored === 'admin' || stored === 'player') {
      setMode(stored)
    } else {
      const inferred: Mode = pathname.startsWith('/admin') || pathname.startsWith('/manage') ? 'admin' : 'player'
      setMode(inferred)
    }
    setModeReady(true)
    // Only run once on mount — this is a one-time "where did the user land" inference, not a sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function switchMode(next: Mode) {
    setMode(next)
    window.localStorage.setItem(MODE_STORAGE_KEY, next)
    router.push(next === 'admin' ? dualRole!.manageHref : '/dashboard')
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  const adminLinks = dualRole
    ? dualRole.isPlatformAdmin
      ? [
          { href: '/admin', label: 'Admin Home' },
          { href: '/admin/tournaments', label: 'Tournaments' },
        ]
      : [{ href: dualRole.manageHref, label: 'Manage Tournament' }]
    : []

  const showAdminLinks = !!dualRole && modeReady && mode === 'admin'
  const showPlayerLinks = !showAdminLinks

  const ModeSwitch = dualRole && (
    <div className="hidden items-center gap-0.5 rounded-full border border-white/20 bg-white/10 p-0.5 sm:flex">
      <button
        type="button"
        onClick={() => switchMode('player')}
        className={cn(
          'rounded-full px-3 py-1 text-xs font-bold transition-colors',
          showPlayerLinks ? 'bg-saffron text-white' : 'text-white/70 hover:text-white',
        )}
      >
        Player
      </button>
      <button
        type="button"
        onClick={() => switchMode('admin')}
        className={cn(
          'rounded-full px-3 py-1 text-xs font-bold transition-colors',
          showAdminLinks ? 'bg-saffron text-white' : 'text-white/70 hover:text-white',
        )}
      >
        Admin
      </button>
    </div>
  )

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

        {/* Mode switch (dual-role users only) */}
        {ModeSwitch}

        {/* Nav links + auth */}
        <div className="flex items-center gap-1 sm:gap-2">
          {showPlayerLinks &&
            PLAYER_LINKS.filter((l) => !l.authOnly).map((link) => (
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
              className="hidden text-sm font-bold text-white/75 transition-colors hover:text-saffron sm:block"
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
            {showPlayerLinks &&
              PLAYER_LINKS.filter((l) => l.authOnly).map((link) => (
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

            {showAdminLinks &&
              adminLinks.map((link) => (
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

          {/* Mobile hamburger toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-md text-white/85 transition-colors hover:text-saffron sm:hidden"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {menuOpen && (
        <div className="border-t border-white/10 bg-ink-deep px-4 py-3 sm:hidden">
          {dualRole && (
            <div className="mb-3 flex items-center gap-0.5 rounded-full border border-white/20 bg-white/10 p-0.5">
              <button
                type="button"
                onClick={() => switchMode('player')}
                className={cn(
                  'flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
                  showPlayerLinks ? 'bg-saffron text-white' : 'text-white/70',
                )}
              >
                Player Mode
              </button>
              <button
                type="button"
                onClick={() => switchMode('admin')}
                className={cn(
                  'flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
                  showAdminLinks ? 'bg-saffron text-white' : 'text-white/70',
                )}
              >
                Admin Mode
              </button>
            </div>
          )}

          <nav className="flex flex-col gap-1">
            {showPlayerLinks &&
              PLAYER_LINKS.filter((l) => !l.authOnly).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'rounded-md px-3 py-2.5 text-sm font-bold transition-colors',
                    isActive(link.href) ? 'bg-white/10 text-saffron' : 'text-white/80 hover:bg-white/5 hover:text-saffron',
                  )}
                >
                  {link.label}
                </Link>
              ))}

            <Show when="signed-in">
              {showPlayerLinks &&
                PLAYER_LINKS.filter((l) => l.authOnly).map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'rounded-md px-3 py-2.5 text-sm font-bold transition-colors',
                      isActive(link.href) ? 'bg-white/10 text-saffron' : 'text-white/80 hover:bg-white/5 hover:text-saffron',
                    )}
                  >
                    {link.label}
                  </Link>
                ))}

              {showAdminLinks &&
                adminLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'rounded-md px-3 py-2.5 text-sm font-bold transition-colors',
                      isActive(link.href) ? 'bg-white/10 text-saffron' : 'text-white/80 hover:bg-white/5 hover:text-saffron',
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
            </Show>

            <Show when="signed-out">
              <Link
                href="/sign-in"
                className="rounded-md px-3 py-2.5 text-sm font-bold text-white/80 transition-colors hover:bg-white/5 hover:text-saffron"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className={cn(rnButtonVariants({ variant: 'primary' }), 'mt-1 w-full justify-center')}
              >
                Join
              </Link>
            </Show>
          </nav>
        </div>
      )}
    </header>
  )
}
