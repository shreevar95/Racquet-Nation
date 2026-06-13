'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Trophy, Swords, Bell, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard',     label: 'Home',         icon: Home },
  { href: '/tournaments',   label: 'Tournaments',  icon: Trophy },
  { href: '/my-matches',    label: 'Matches',      icon: Swords },
  { href: '/notifications', label: 'Alerts',       icon: Bell },
  { href: '/profile',       label: 'Profile',      icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface/95 backdrop-blur-md pb-safe">
      <div className="flex h-16 items-center justify-around px-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full rounded-md transition-colors duration-150',
                active
                  ? 'text-brand-400'
                  : 'text-text-muted hover:text-text-secondary',
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
