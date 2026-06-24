const sports = [
  { emoji: '🏓', label: 'Pickleball' },
  { emoji: '🎾', label: 'Tennis' },
  { emoji: '🏸', label: 'Badminton' },
  { label: 'Squash' },
  { label: 'Table Tennis' },
  { label: 'Padel' },
]

export function MarketingSports() {
  return (
    <div className="mx-auto max-w-[1160px] px-7 py-20 text-center">
      <div className="rn-reveal mb-3.5 text-[13px] font-extrabold uppercase tracking-[.18em] text-saffron">
        One app
      </div>
      <h2 className="rn-reveal m-0 mb-[30px] font-nunito text-[clamp(1.75rem,_4.5vw,_2.75rem)] font-black uppercase tracking-[-.03em] text-ink">
        Six sports to manage
      </h2>
      <div className="flex flex-wrap justify-center gap-3">
        {sports.map((sport) => (
          <span
            key={sport.label}
            className="rn-card-hover rounded-[14px] bg-rn-card px-[26px] py-[13px] text-base font-extrabold text-ink shadow-[0_8px_20px_rgba(16,28,44,.07)]"
          >
            {sport.emoji ? `${sport.emoji} ${sport.label}` : sport.label}
          </span>
        ))}
      </div>
    </div>
  )
}
