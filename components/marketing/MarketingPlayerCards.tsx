const players = [
  { name: 'A. Mehta', team: 'Smashers', pos: 'S1', pts: '24', gradient: 'from-saffron to-saffron-300', ptsColor: 'text-rn-green' },
  { name: 'P. Sharma', team: 'Smashers', pos: 'D-A', pts: '18', gradient: 'from-[#2A6FB0] to-rn-blue', ptsColor: 'text-ink' },
  { name: 'R. Kapoor', team: 'Smashers', pos: 'S2', pts: '15', gradient: 'from-[#0E7C4B] to-rn-green', ptsColor: 'text-ink' },
  { name: 'I. Tandon', team: 'Smashers', pos: 'D-B', pts: '12', gradient: 'from-[#C6952A] to-rn-yellow', ptsColor: 'text-ink' },
]

export function MarketingPlayerCards() {
  return (
    <div className="mx-auto max-w-[1160px] px-7 py-[60px]">
      <div className="mb-[42px] text-center">
        <div className="rn-reveal mb-3.5 text-[13px] font-extrabold uppercase tracking-[.18em] text-saffron">
          Your players
        </div>
        <h2 className="rn-reveal m-0 font-nunito text-[clamp(2rem,_4.5vw,_2.875rem)] font-black uppercase tracking-[-.03em] text-ink">
          Every point counts
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
        {players.map((player) => (
          <div
            key={player.name}
            className="rn-reveal rn-card-hover overflow-hidden rounded-[20px] bg-rn-card shadow-[0_12px_30px_rgba(16,28,44,.09)]"
          >
            <div className={`relative bg-gradient-to-br px-4 pb-[30px] pt-[18px] ${player.gradient}`}>
              <div className="absolute right-3 top-3 rounded-lg bg-white/22 px-2 py-[3px] text-[11px] font-extrabold text-white">
                {player.pos}
              </div>
              <div className="mx-auto mt-1 h-14 w-14 rounded-2xl bg-white/90" />
            </div>
            <div className="-mt-3.5 px-3.5 pb-[18px] text-center">
              <div className="rounded-[13px] bg-rn-card px-2.5 py-3 shadow-[0_6px_16px_rgba(16,28,44,.1)]">
                <div className="text-[15px] font-extrabold text-ink">{player.name}</div>
                <div className="mt-px text-xs font-bold text-rn-text-muted">{player.team}</div>
                <div className="mt-2.5 flex items-baseline justify-center gap-1.5">
                  <span className={`font-nunito text-[28px] font-black ${player.ptsColor}`}>
                    {player.pts}
                  </span>
                  <span className="text-[11px] font-extrabold text-rn-text-muted">PTS</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
