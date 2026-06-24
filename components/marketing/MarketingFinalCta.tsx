import Link from 'next/link'

export function MarketingFinalCta() {
  return (
    <div className="mx-auto max-w-[1160px] px-7 pb-[70px]">
      <div className="relative overflow-hidden rounded-[30px] bg-[radial-gradient(120%_140%_at_100%_0%,#FF9A5A_0%,#F26B21_45%,#D2541A_100%)] px-10 py-16 text-center shadow-[0_28px_60px_rgba(242,107,33,.34)]">
        <div className="pointer-events-none absolute -left-0 -top-[60px] h-[200px] w-[200px] translate-x-10 rounded-full bg-white/12" />
        <div className="pointer-events-none absolute -bottom-20 right-20 h-[240px] w-[240px] rounded-full bg-white/8" />

        <h2 className="rn-reveal relative m-0 mb-3.5 font-nunito text-[clamp(2rem,_6vw,_3.625rem)] font-black uppercase leading-[.98] tracking-[-.03em] text-white">
          Gameweek 7 is live.
          <br />
          Don&apos;t miss out.
        </h2>
        <p className="rn-reveal relative mb-7 text-lg text-white/92">
          Create your team free and join a league in under a minute.
        </p>
        <Link
          href="/sign-up"
          className="rn-cta-hover rn-reveal relative inline-block rounded-[14px] bg-white px-[34px] py-4 text-[17px] font-extrabold text-saffron shadow-[0_12px_30px_rgba(0,0,0,.18)]"
        >
          Create your team →
        </Link>
      </div>
    </div>
  )
}
