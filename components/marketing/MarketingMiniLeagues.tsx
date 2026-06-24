const leaderboard = [
  { rank: '1', move: '▲ 2', moveColor: 'text-rn-green', initials: 'NN', color: '#19A463', name: 'Net Ninjas', gw: '92', total: '641', me: false },
  { rank: '2', move: '▼ 1', moveColor: 'text-red-down', initials: 'AC', color: '#F4C24B', name: 'Aces', gw: '78', total: '628', me: false },
  { rank: '3', move: '▲ 4', moveColor: 'text-rn-green', initials: 'SM', color: '#F26B21', name: 'Smashers', gw: '82', total: '615', me: true },
  { rank: '4', move: '—', moveColor: 'text-rn-text-muted', initials: 'RK', color: '#3E9BD8', name: 'Rally Kings', gw: '71', total: '602', me: false },
  { rank: '5', move: '▼ 2', moveColor: 'text-red-down', initials: 'BL', color: '#8493a6', name: 'Baseliners', gw: '69', total: '588', me: false },
]

export function MarketingMiniLeagues() {
  return (
    <div
      id="mini-leagues"
      className="mx-auto grid max-w-[1160px] grid-cols-1 items-center gap-11 px-7 py-[50px] lg:grid-cols-[.85fr_1.15fr]"
    >
      <div>
        <div className="rn-reveal mb-3.5 text-[13px] font-extrabold uppercase tracking-[.18em] text-rn-green">
          Mini-leagues
        </div>
        <h2 className="rn-reveal m-0 mb-4 font-nunito text-[clamp(2rem,_4.5vw,_2.875rem)] font-black uppercase leading-[1.02] tracking-[-.03em] text-ink">
          Bragging rights,{' '}
          <span className="bg-gradient-to-r from-rn-green to-rn-green-300 bg-clip-text text-transparent">
            settled.
          </span>
        </h2>
        <p className="rn-reveal mb-[22px] max-w-[380px] text-lg leading-[1.6] text-rn-text-secondary">
          Start a league with your club, office or group chat. Live tables, rank movement and
          weekly winners.
        </p>
        <a
          href="#"
          className="rn-cta-hover rn-reveal inline-block rounded-[13px] bg-gradient-to-br from-rn-green to-rn-green-300 px-6 py-3.5 text-[15px] font-extrabold text-white shadow-[0_10px_24px_rgba(25,164,99,.32)]"
        >
          Start a league →
        </a>
      </div>

      <div className="rn-reveal rn-card-hover rounded-rn-card bg-rn-card p-2.5 shadow-[0_18px_44px_rgba(16,28,44,.12)]">
        <div className="flex items-center justify-between px-[18px] pb-3 pt-4">
          <span className="font-nunito text-[17px] font-extrabold text-ink">Office League · GW7</span>
          <span className="text-xs font-extrabold text-rn-text-muted">24 teams</span>
        </div>
        {leaderboard.map((row, i) => (
          <div
            key={row.rank}
            className={`flex items-center gap-[11px] rounded-xl px-3.5 py-[11px] ${
              row.me ? 'bg-saffron-tint' : i % 2 === 0 ? 'bg-[#F7F5F0]' : ''
            }`}
          >
            <span className="w-[26px] font-nunito text-[15px] font-extrabold text-ink">{row.rank}</span>
            <span className={`w-[34px] text-xs font-extrabold ${row.moveColor}`}>{row.move}</span>
            <span
              className="flex h-8 w-8 items-center justify-center rounded-[9px] text-[11px] font-extrabold text-white"
              style={{ background: row.color }}
            >
              {row.initials}
            </span>
            <span className="flex-1 text-[15px] font-bold text-ink">{row.name}</span>
            <span className="mr-3.5 text-xs font-bold text-rn-text-muted">GW {row.gw}</span>
            <span className="font-nunito text-base font-extrabold text-ink">{row.total}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
