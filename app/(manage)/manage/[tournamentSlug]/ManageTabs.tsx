'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const ADMIN_TABS = [
  { href: '', label: 'Overview' },
  { href: '/registrations', label: 'Registrations' },
  { href: '/teams', label: 'Teams' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/lineups', label: 'Lineups' },
  { href: '/scoring', label: 'Scoring' },
  { href: '/settings', label: 'Settings' },
]

const CAPTAIN_TABS = [{ href: '/teams', label: 'My Team' }]

export function ManageTabs({ tournamentSlug, isAdmin }: { tournamentSlug: string; isAdmin: boolean }) {
  const pathname = usePathname()
  const base = `/manage/${tournamentSlug}`
  const tabs = isAdmin ? ADMIN_TABS : CAPTAIN_TABS

  return (
    <nav className="scroll-x-tabs my-6">
      {tabs.map((tab) => {
        const href = `${base}${tab.href}`
        const active = tab.href === '' ? pathname === href : pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={tab.href}
            href={href}
            className={cn(
              'shrink-0 snap-start whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors',
              active
                ? 'bg-saffron text-white'
                : 'border border-rn-border text-rn-text-secondary hover:border-saffron hover:text-saffron',
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
