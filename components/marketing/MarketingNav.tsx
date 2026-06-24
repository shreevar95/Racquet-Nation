import Link from 'next/link'

const links = [
  { label: 'Leagues', href: '#mini-leagues' },
  { label: 'Fixtures', href: '/tournaments' },
  { label: 'How to play', href: '#how-to-play' },
]

export function MarketingNav() {
  return (
    <div className="sticky top-0 z-50 border-b border-ink/[.07] bg-paper/[.82] backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex max-w-[1160px] items-center justify-between px-7 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-gradient-to-br from-saffron to-saffron-300 font-nunito text-sm font-black text-white">
            RN
          </span>
          <span className="font-nunito text-lg font-extrabold tracking-tight text-ink">
            Racquet Nation
          </span>
        </Link>

        <div className="flex items-center gap-7">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="hidden text-sm font-bold text-rn-text-secondary transition-colors hover:text-saffron sm:block"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/sign-in"
            className="hidden text-sm font-bold text-rn-text-secondary transition-colors hover:text-saffron sm:block"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rn-cta-hover rounded-xl bg-gradient-to-br from-saffron to-saffron-300 px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_6px_16px_rgba(242,107,33,.32)]"
          >
            Join free
          </Link>
        </div>
      </div>
    </div>
  )
}
