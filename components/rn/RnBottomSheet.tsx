'use client'

import type { ReactNode } from 'react'

interface RnBottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function RnBottomSheet({ open, onClose, title, children }: RnBottomSheetProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-[#222b30]/45" onClick={onClose} />
      <div className="relative flex max-h-[calc(100dvh-80px)] w-full flex-col overflow-hidden rounded-t-3xl bg-rn-card shadow-[0_-10px_30px_rgba(0,0,0,.18)] sm:max-h-[80vh] sm:max-w-[480px] sm:rounded-3xl sm:shadow-[0_20px_60px_rgba(0,0,0,.25)]">
        <div className="shrink-0 px-[18px] pt-[14px] pb-3">
          <div className="mx-auto mb-3.5 h-1 w-10 rounded-full bg-[#dbe3e6] sm:hidden" />
          {title && (
            <div className="flex items-center justify-between">
              <span className="font-nunito text-[15px] font-black text-ink">{title}</span>
              <button type="button" onClick={onClose} className="text-[13px] font-extrabold text-rn-text-muted">
                Cancel
              </button>
            </div>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-[18px] pb-6 pt-1">{children}</div>
      </div>
    </div>
  )
}
