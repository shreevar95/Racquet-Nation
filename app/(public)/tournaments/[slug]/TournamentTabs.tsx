'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '', label: 'Overview' },
  { href: '/bracket', label: 'Bracket' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/results', label: 'Results' },
  { href: '/standings', label: 'Standings' },
  { href: '/teams', label: 'Teams' },
  { href: '/players', label: 'Players' },
  { href: '/rules', label: 'Rules' },
  { href: '/announcements', label: 'Updates' },
]

export function TournamentTabs({ slug }: { slug: string }) {
  const pathname = usePathname()
  const base = `/tournaments/${slug}`

  return (
    <nav className="scroll-x-tabs my-6">
      {TABS.map((tab) => {
        const href = `${base}${tab.href}`
        const active = pathname === href
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
