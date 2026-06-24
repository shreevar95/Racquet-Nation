const columns = [
  { title: 'PLAY', links: ['Leagues', 'Fixtures', 'Live scoring'] },
  { title: 'SPORTS', links: ['Pickleball', 'Tennis', 'Padel'] },
  { title: 'COMPANY', links: ['About', 'Privacy', 'Terms'] },
]

export function MarketingFooter() {
  return (
    <div className="bg-ink-deep text-white">
      <div className="mx-auto grid max-w-[1160px] grid-cols-1 gap-[30px] px-7 pb-9 pt-[52px] sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="mb-[13px] flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-gradient-to-br from-saffron to-saffron-300 font-nunito text-[13px] font-black text-white">
              RN
            </span>
            <span className="font-nunito text-[17px] font-extrabold">Racquet Nation</span>
          </div>
          <p className="m-0 max-w-[250px] text-[13px] leading-[1.6] text-[#8fa1b4]">
            Fantasy racquet sports — pick your squad, run your league, win the season.
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <div className="mb-[13px] text-[11px] font-extrabold tracking-[.12em] text-[#6a7e92]">
              {column.title}
            </div>
            <div className="flex flex-col gap-2.5 text-[13px] font-semibold text-[#b9c6d2]">
              {column.links.map((link) => (
                <span key={link} className="cursor-pointer transition-colors hover:text-saffron">
                  {link}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto flex max-w-[1160px] justify-between border-t border-[#1e3148] px-7 py-[18px] text-xs text-[#6a7e92]">
        <span>© 2026 Racquet Nation</span>
        <span>Made for managers, by players.</span>
      </div>
    </div>
  )
}
