const checks = [
  'Push alerts the moment a result drops',
  'Captain & bonus points calculated instantly',
  'Live rank movement across all your leagues',
]

const liveRows = [
  { initials: 'AM', bg: 'bg-saffron', text: 'text-white', name: 'A. Mehta (C)', meta: 'Singles 1 · won 2–0', pts: '+24', ptsColor: 'text-rn-green' },
  { initials: 'PS', bg: 'bg-rn-blue', text: 'text-white', name: 'P. Sharma', meta: 'Doubles A · live', pts: '+11', ptsColor: 'text-saffron' },
  { initials: 'RK', bg: 'bg-rn-yellow', text: 'text-ink', name: 'R. Kapoor', meta: 'Singles 2 · 1–1', pts: '+8', ptsColor: 'text-rn-text-muted' },
]

export function MarketingLiveScoring() {
  return (
    <div className="relative overflow-hidden bg-[radial-gradient(120%_120%_at_20%_0%,#0E7C4B_0%,#0A2A1C_70%)] text-white">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/[.06]" />

      <div className="relative mx-auto grid max-w-[1160px] grid-cols-1 items-center gap-12 px-7 py-20 lg:grid-cols-2">
        <div>
          <div className="rn-reveal mb-4 text-[13px] font-extrabold uppercase tracking-[.18em] text-rn-green-soft">
            Live scoring
          </div>
          <h2 className="rn-reveal m-0 mb-[18px] font-nunito text-[clamp(2rem,_4.8vw,_3.125rem)] font-black uppercase leading-none tracking-[-.03em]">
            Feel every
            <br />
            <span className="bg-gradient-to-r from-rn-green-soft to-rn-green-300 bg-clip-text text-transparent">
              point land.
            </span>
          </h2>
          <p className="rn-reveal mb-6 max-w-[400px] text-lg leading-[1.6] text-[#bfe3cd]">
            Scores stream in as matches play out. Your gameweek total ticks up in real time — pure
            edge-of-seat.
          </p>
          <div className="rn-reveal flex flex-col gap-3.5">
            {checks.map((check) => (
              <div key={check} className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rn-green-soft/[.18] text-[13px] font-black text-rn-green-soft">
                  ✓
                </span>
                <span className="text-base text-[#eaf6ee]">{check}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Phone */}
        <div className="rn-float-c flex justify-center">
          <div className="w-[282px] rounded-rn-phone-bezel bg-ink-deep p-[9px] shadow-rn-phone">
            <div className="overflow-hidden rounded-rn-phone bg-paper">
              <div className="bg-gradient-to-br from-saffron to-saffron-300 px-[18px] pb-3.5 pt-[18px] text-white">
                <div className="text-[11px] font-extrabold tracking-[.1em] opacity-90">
                  GAMEWEEK 7 · LIVE
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-nunito text-[44px] font-black leading-none">82</span>
                  <span className="rounded-[7px] bg-white/25 px-2 py-0.5 text-[13px] font-extrabold">
                    ▲ 12 pts
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 p-3.5">
                {liveRows.map((row) => (
                  <div
                    key={row.name}
                    className="flex items-center gap-2.5 rounded-[13px] bg-rn-card p-3 shadow-[0_4px_12px_rgba(16,28,44,.06)]"
                  >
                    <span
                      className={`flex h-[30px] w-[30px] items-center justify-center rounded-[9px] text-[11px] font-extrabold ${row.bg} ${row.text}`}
                    >
                      {row.initials}
                    </span>
                    <div className="flex-1">
                      <div className="text-[13px] font-extrabold text-ink">{row.name}</div>
                      <div className="text-[11px] text-rn-text-muted">{row.meta}</div>
                    </div>
                    <span className={`font-nunito text-lg font-black ${row.ptsColor}`}>{row.pts}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
