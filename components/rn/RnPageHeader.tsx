import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface RnPageHeaderProps {
  eyebrow?: string
  title?: ReactNode
  backHref?: string
  right?: ReactNode
  children?: ReactNode
  className?: string
}

export function RnPageHeader({ eyebrow, title, backHref, right, children, className }: RnPageHeaderProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-b-[20px] bg-gradient-to-br from-[#1B3A57] to-ink-deep px-5 pb-4 pt-2.5 text-white',
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-5 -top-[30px] h-[110px] w-[110px] rounded-full bg-white/10" />
      <div className="relative">
        {backHref && (
          <Link
            href={backHref}
            className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-extrabold text-white/90"
          >
            ← Back
          </Link>
        )}
        {(eyebrow || title || right) && (
          <div className="flex items-center justify-between gap-4">
            <div>
              {eyebrow && (
                <div className="text-[10px] font-extrabold tracking-[.14em] text-white/80">{eyebrow}</div>
              )}
              {title && (
                <div className="font-nunito text-lg font-black leading-tight tracking-tight">{title}</div>
              )}
            </div>
            {right}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
