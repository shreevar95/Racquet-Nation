import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = {
  title: 'Racquet Nation — Play. Compete. Win.',
  description:
    "India's premier tournament and league platform for racquet sports. Live scores, standings, team lineups, and more.",
}

export const revalidate = 3600

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
      </svg>
    ),
    title: 'Tournament Management',
    description: 'Create and run full tournaments with automated scheduling, group stages, and knockout brackets.',
    color: 'orange',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
    title: 'Live Standings',
    description: 'Real-time standings updated the moment scores are entered. Points, differentials, and qualification status.',
    color: 'green',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
      </svg>
    ),
    title: 'Team Lineups',
    description: 'Captains submit sealed lineups before each match — revealed simultaneously when both teams lock in.',
    color: 'orange',
  },
]

export default async function HomePage() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  const [tournamentCount, playerCount, teamCount] = await Promise.all([
    prisma.tournament.count({ where: { isPublic: true, status: { not: 'ARCHIVED' } } }),
    prisma.user.count(),
    prisma.team.count(),
  ])

  const stats = [
    { value: String(tournamentCount), label: 'Tournaments' },
    { value: String(playerCount), label: 'Players' },
    { value: String(teamCount), label: 'Teams' },
    { value: '6', label: 'Sports' },
  ]

  return (
    <div className="flex flex-col">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-end overflow-hidden">

        {/* Background photo */}
        <div className="absolute inset-0">
          <Image
            src="/images/lifestyle/_MG_6397.JPG"
            alt="Racquet Nation"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          {/* Dark gradient overlay — bottom-up + slight left */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
        </div>

        {/* Hero content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
          <div className="max-w-2xl">

            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-5">
              <span className="h-0.5 w-8 bg-brand-500" />
              <span className="text-brand-500 text-xs font-bold tracking-[0.2em] uppercase font-display">
                India's #1 Racquet Sports Platform
              </span>
            </div>

            {/* Main headline */}
            <h1 className="font-display font-black uppercase leading-[0.9] tracking-tight text-text-primary mb-6">
              <span className="block text-[clamp(4rem,12vw,8rem)]">PLAY.</span>
              <span className="block text-[clamp(4rem,12vw,8rem)] text-brand-500">COMPETE.</span>
              <span className="block text-[clamp(4rem,12vw,8rem)]">WIN.</span>
            </h1>

            {/* Sub */}
            <p className="text-white/70 text-lg sm:text-xl font-sans mb-8 max-w-md leading-relaxed">
              Professional tournament management for pickleball and racquet sports.
              Schedules, standings, lineups — all in one place.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/tournaments">
                <Button
                  size="lg"
                  className="w-full sm:w-auto text-base font-bold tracking-wide uppercase font-display bg-brand-500 hover:bg-brand-600 text-white px-8"
                >
                  Browse Tournaments
                </Button>
              </Link>
              {userId ? (
                <Link href="/dashboard">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full sm:w-auto text-base font-bold tracking-wide uppercase font-display border border-white/20 hover:bg-white/10"
                  >
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <Link href="/sign-up">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full sm:w-auto text-base font-bold tracking-wide uppercase font-display border border-white/20 hover:bg-white/10"
                  >
                    Join Now
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────────────────────── */}
      <section className="bg-brand-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-brand-600">
            {stats.map((s) => (
              <div key={s.label} className="py-6 px-4 text-center">
                <div className="font-display font-black text-3xl sm:text-4xl text-text-primary uppercase leading-none">
                  {s.value}
                </div>
                <div className="text-brand-100 text-xs font-bold tracking-widest uppercase mt-1">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-surface">
        <div className="max-w-7xl mx-auto">

          {/* Section header */}
          <div className="mb-14">
            <p className="text-brand-500 text-xs font-bold tracking-[0.2em] uppercase font-display mb-3">
              Everything you need
            </p>
            <h2 className="font-display font-black text-[clamp(2.5rem,6vw,4rem)] uppercase text-text-primary leading-tight">
              Built for<br />
              <span className="text-brand-500">competitive play.</span>
            </h2>
          </div>

          {/* Feature cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-surface p-8 glow-card transition-all duration-300 group flex flex-col items-center text-center"
              >
                <div className={[
                  'inline-flex items-center justify-center w-14 h-14 rounded-lg mb-6 transition-colors',
                  f.color === 'orange'
                    ? 'bg-brand-500/10 text-brand-500 group-hover:bg-brand-500/20'
                    : 'bg-green-800/20 text-green-500 group-hover:bg-green-800/30',
                ].join(' ')}>
                  {f.icon}
                </div>
                <h3 className="font-display font-bold text-xl uppercase tracking-wide text-text-primary mb-3">
                  {f.title}
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Lifestyle Photo Strip ─────────────────────────────────────────── */}
      <section className="relative h-[50vh] sm:h-[60vh] overflow-hidden">
        <Image
          src="/images/lifestyle/_MG_6342.JPG"
          alt="Racquet Nation in action"
          fill
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
            <h2 className="font-display font-black text-[clamp(2rem,5vw,3.5rem)] uppercase text-text-primary leading-tight max-w-sm">
              YOUR COURT.<br />
              <span className="text-brand-500">YOUR RULES.</span>
            </h2>
            <p className="text-white/60 text-sm mt-3 max-w-xs">
              Join a community of serious players across India.
            </p>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-surface-raised text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display font-black text-[clamp(2.5rem,7vw,5rem)] uppercase text-text-primary leading-tight mb-6">
            READY TO<br />
            <span className="text-brand-500">COMPETE?</span>
          </h2>
          <p className="text-white/70 text-lg mb-10">
            Sign up and find tournaments near you.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/tournaments">
              <Button size="lg" className="w-full sm:w-auto font-bold tracking-wide uppercase font-display px-10 bg-brand-500 hover:bg-brand-600">
                Browse Tournaments
              </Button>
            </Link>
            {!userId && (
              <Link href="/sign-up">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto font-bold tracking-wide uppercase font-display px-10 border border-white/20 hover:bg-white/10">
                  Create Account
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

    </div>
  )
}
