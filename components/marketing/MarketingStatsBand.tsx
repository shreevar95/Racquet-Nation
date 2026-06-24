const stats = [
  { value: '4.8k', label: 'MANAGERS' },
  { value: '1.2k', label: 'MINI-LEAGUES' },
  { value: '120+', label: 'TOURNAMENTS' },
  { value: '6', label: 'SPORTS' },
]

export function MarketingStatsBand() {
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
