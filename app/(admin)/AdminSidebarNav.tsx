'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/tournaments', label: 'Tournaments' },
  { href: '/admin/users', label: 'Users' },
]

export function AdminSidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-0.5">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(link.href + '/')
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-bold transition-colors',
              active ? 'bg-saffron-tint text-saffron' : 'text-rn-text-secondary hover:bg-paper hover:text-ink',
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
