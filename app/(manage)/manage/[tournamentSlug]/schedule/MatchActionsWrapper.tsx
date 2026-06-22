'use client'

export function MatchActionsWrapper({ children }: { children: React.ReactNode }) {
  return (
    <span onClick={(e) => e.preventDefault()} className="flex items-center gap-1.5">
      {children}
    </span>
  )
}
