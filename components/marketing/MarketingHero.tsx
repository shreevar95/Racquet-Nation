import Link from 'next/link'

export function MarketingHero() {
  return (
    <div className="relative overflow-hidden bg-[radial-gradient(120%_120%_at_80%_0%,#1B3A57_0%,#0E1B2A_60%)] text-white">
      <div className="pointer-events-none absolute -left-20 -top-30 h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,rgba(242,107,33,.32),transparent_70%)]" />
      <div className="pointer-events-none absolute -bottom-40 -right-15 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(25,164,99,.28),transparent_70%)]" />

      <div className="relative mx-auto grid max-w-[1160px] grid-cols-1 items-center gap-10 px-7 py-[70px] pb-[90px] lg:grid-cols-[1.05fr_1fr]">
        {/* Copy */}
        <div>
          <div className="rn-reveal mb-[22px] inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-3.5 py-1.5">
            <span className="h-2 w-2 rounded-full bg-rn-green-300 shadow-[0_0_0_4px_rgba(52,215,126,.25)]" />
            <span className="text-xs font-extrabold tracking-[.08em]">GAMEWEEK 7 IS LIVE</span>
          </div>

          <h1 className="rn-reveal m-0 font-nunito text-[clamp(2.75rem,_9vw,_4.625rem)] font-black uppercase leading-[.94] tracking-[-.03em]">
            Pick your
            <br />
            squad.
            <br />
            <span className="bg-gradient-to-r from-saffron-300 to-saffron bg-clip-text text-transparent">
              Rule the league.
            </span>
          </h1>

          <p className="rn-reveal mt-6 max-w-[420px] text-lg leading-[1.55] text-[#aebfd0]">
            Draft your team, submit sealed lineups, and climb the table every gameweek — across
            six racquet sports.
          </p>

          <div className="rn-reveal mt-[30px] flex flex-wrap gap-3.5">
            <Link
              href="/sign-up"
              className="rn-cta-hover rounded-2xl bg-gradient-to-br from-saffron to-saffron-300 px-7 py-[15px] text-base font-extrabold text-white shadow-rn-brand-glow"
            >
              Create your team →
            </Link>
            <Link
              href="#how-to-play"
              className="rn-cta-hover rounded-2xl border border-white/20 bg-white/10 px-7 py-[15px] text-base font-extrabold text-white"
            >
              How to play
            </Link>
          </div>

          <div className="rn-reveal mt-7 flex items-center gap-2.5">
            <div className="flex">
              <span className="h-[30px] w-[30px] rounded-full border-2 border-ink-deep bg-saffron" />
              <span className="-ml-2.5 h-[30px] w-[30px] rounded-full border-2 border-ink-deep bg-rn-green" />
              <span className="-ml-2.5 h-[30px] w-[30px] rounded-full border-2 border-ink-deep bg-rn-blue" />
              <span className="-ml-2.5 h-[30px] w-[30px] rounded-full border-2 border-ink-deep bg-rn-yellow" />
            </div>
            <span className="text-sm font-bold text-[#9fb1c4]">
              4,800+ managers competing this week
            </span>
          </div>
        </div>

        {/* Floating card cluster */}
        <div className="relative hidden h-[440px] lg:block">
          {/* Gameweek points */}
          <div className="rn-float-c absolute left-[30px] top-9 z-30 w-[230px] rounded-[22px] bg-gradient-to-br from-saffron to-saffron-300 p-5 text-white shadow-[0_26px_60px_rgba(242,107,33,.4)]">
            <div className="text-[11px] font-extrabold tracking-[.12em] opacity-90">
              GAMEWEEK POINTS
            </div>
            <div className="my-1.5 font-nunito text-[62px] font-black leading-none">82</div>
            <div className="flex items-center gap-1.5 text-[13px] font-extrabold">
              <span className="rounded-[7px] bg-white/25 px-1.5 py-0.5">▲ 12</span>
              <span className="opacity-90">vs avg</span>
            </div>
          </div>

          {/* Mini-league card */}
          <div className="rn-float-a absolute right-0 top-0 z-20 w-[248px] rounded-[20px] bg-rn-card p-4 text-ink shadow-rn-floating">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-extrabold tracking-[.1em] text-rn-text-muted">
                OFFICE LEAGUE
              </span>
              <span className="text-[11px] font-extrabold text-rn-green">▲ 2</span>
            </div>
            <div className="flex items-center gap-2.5 py-1.5">
              <span className="w-[18px] text-[13px] font-extrabold text-rn-text-muted">1</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-rn-green text-[9px] font-extrabold text-white">
                NN
              </span>
              <span className="flex-1 text-[13px] font-bold">Net Ninjas</span>
              <span className="text-[13px] font-extrabold">641</span>
            </div>
            <div className="flex items-center gap-2.5 py-1.5">
              <span className="w-[18px] text-[13px] font-extrabold text-rn-text-muted">2</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-rn-yellow text-[9px] font-extrabold text-ink">
                AC
              </span>
              <span className="flex-1 text-[13px] font-bold">Aces</span>
              <span className="text-[13px] font-extrabold">628</span>
            </div>
            <div className="-mx-1 mt-0.5 flex items-center gap-2.5 rounded-[9px] bg-saffron-tint px-2 py-2">
              <span className="w-[18px] text-[13px] font-extrabold text-saffron">3</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-saffron text-[9px] font-extrabold text-white">
                SM
              </span>
              <span className="flex-1 text-[13px] font-extrabold">Smashers</span>
              <span className="text-[13px] font-extrabold">615</span>
            </div>
          </div>

          {/* Next fixture card */}
          <div className="rn-float-b absolute bottom-2 right-[54px] z-40 w-[236px] rounded-[20px] border border-[#25405c] bg-ink p-4 text-white shadow-[0_26px_60px_rgba(0,0,0,.45)]">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-extrabold tracking-[.12em] text-rn-yellow">
                NEXT FIXTURE
              </span>
              <span className="text-[10px] font-extrabold text-[#9fb1c4]">SAT 4PM</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 text-center">
                <div className="mx-auto mb-1.5 flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-saffron text-xs font-extrabold">
                  SM
                </div>
                <div className="text-xs font-extrabold">Smashers</div>
              </div>
              <span className="font-nunito text-[13px] font-extrabold text-[#6f8295]">VS</span>
              <div className="flex-1 text-center">
                <div className="mx-auto mb-1.5 flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-rn-green text-xs font-extrabold">
                  NN
                </div>
                <div className="text-xs font-extrabold">Net Ninjas</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
