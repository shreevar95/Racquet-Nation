function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(n)
}

export function MarketingStatsBand({
  managerCount,
  teamCount,
  tournamentCount,
  sportCount,
}: {
  managerCount: number
  teamCount: number
  tournamentCount: number
  sportCount: number
}) {
  const stats = [
    { value: formatCount(managerCount), label: 'MANAGERS' },
    { value: formatCount(teamCount), label: 'TEAMS' },
    { value: formatCount(tournamentCount), label: 'TOURNAMENTS' },
    { value: String(sportCount), label: 'SPORTS' },
  ]

  return (
    <div className="bg-gradient-to-br from-saffron to-saffron-300">
      <div className="mx-auto grid max-w-[1160px] grid-cols-4 px-7">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`px-3.5 py-[30px] text-center ${i < stats.length - 1 ? 'border-r border-white/20' : ''}`}
          >
            <div className="font-nunito text-[42px] font-black leading-none text-white">{stat.value}</div>
            <div className="mt-1.5 text-[11px] font-extrabold tracking-[.12em] text-white/85">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
