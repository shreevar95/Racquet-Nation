const steps = [
  {
    number: 1,
    gradient: 'from-saffron to-saffron-300',
    glow: 'shadow-[0_8px_18px_rgba(242,107,33,.3)]',
    title: 'Draft your squad',
    description: 'Build your team from the player pool and name your captain for double points.',
  },
  {
    number: 2,
    gradient: 'from-[#0E7C4B] to-rn-green',
    glow: 'shadow-[0_8px_18px_rgba(25,164,99,.3)]',
    title: 'Submit sealed lineup',
    description: 'Lock your lineup before each round. Both captains reveal at once — no peeking.',
  },
  {
    number: 3,
    gradient: 'from-[#2A6FB0] to-rn-blue',
    glow: 'shadow-[0_8px_18px_rgba(62,155,216,.3)]',
    title: 'Score & climb',
    description: 'Points post live as matches finish. Watch your rank rise across every league.',
  },
]

export function MarketingHowToPlay() {
  return (
    <div id="how-to-play" className="mx-auto max-w-[1160px] px-7 pb-[50px] pt-[88px]">
      <div className="mb-12 text-center">
        <div className="rn-reveal mb-3.5 text-[13px] font-extrabold uppercase tracking-[.18em] text-saffron">
          How to play
        </div>
        <h2 className="rn-reveal m-0 font-nunito text-[clamp(2rem,_5vw,_3.125rem)] font-black uppercase tracking-[-.03em] text-ink">
          Three steps to{' '}
          <span className="bg-gradient-to-r from-saffron to-saffron-300 bg-clip-text text-transparent">
            game day
          </span>
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.number}
            className="rn-reveal rn-card-hover rounded-rn-card bg-rn-card p-7 shadow-rn-card"
          >
            <div
              className={`mb-[18px] flex h-[54px] w-[54px] items-center justify-center rounded-[15px] bg-gradient-to-br font-nunito text-[22px] font-black text-white ${step.gradient} ${step.glow}`}
            >
              {step.number}
            </div>
            <h3 className="m-0 mb-[9px] font-nunito text-xl font-extrabold text-ink">{step.title}</h3>
            <p className="m-0 text-[15px] leading-[1.6] text-rn-text-secondary">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
