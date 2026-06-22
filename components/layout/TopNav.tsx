import Image from 'next/image'
import Link from 'next/link'
import { Show, UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'

interface TopNavProps {
  transparent?: boolean
}

export function TopNav({ transparent = false }: TopNavProps) {
  return (
    <header
      className={[
        'sticky top-0 z-50 w-full',
        'border-b border-white/8 backdrop-blur-md',
        transparent ? 'bg-transparent' : 'bg-surface/95',
      ].join(' ')}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image
            src="/images/logos/rn-monogram-white.png"
            alt="RN"
            width={44}
            height={44}
            className="h-8 w-8 object-contain"
            priority
          />
          <span className="hidden sm:block font-display font-black text-sm uppercase tracking-[0.12em] text-text-primary leading-none">
            Racquet<br />Nation
          </span>
        </Link>

        {/* Nav links + auth */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/tournaments"
            className="hidden sm:block text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors px-3 py-1.5 rounded-md hover:bg-surface-raised"
          >
            Tournaments
          </Link>

          <Show when="signed-out">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm" className="font-semibold">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up" className="hidden sm:block">
              <Button size="sm" className="font-semibold">
                Join
              </Button>
            </Link>
          </Show>

          <Show when="signed-in">
            <Link
              href="/my-teams"
              className="hidden sm:block text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors px-3 py-1.5 rounded-md hover:bg-surface-raised"
            >
              My Teams
            </Link>
            <Link
              href="/dashboard"
              className="hidden sm:block text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors px-3 py-1.5 rounded-md hover:bg-surface-raised"
            >
              Dashboard
            </Link>
            <UserButton
              appearance={{
                elements: { avatarBox: 'h-8 w-8' },
              }}
            />
          </Show>

        </div>
      </div>
    </header>
  )
}
