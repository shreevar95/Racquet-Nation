'use client'

import { RnCard } from '@/components/rn/RnCard'

export default function ManageError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <RnCard className="mt-6 space-y-3 border-red-down/30 bg-red-down/5 p-5">
      <p className="text-sm font-bold text-red-down">
        Something went wrong
        {process.env.NODE_ENV !== 'production' && error.message ? `: ${error.message}` : ''}
      </p>
      <button
        onClick={reset}
        className="text-xs font-bold text-saffron underline transition-colors hover:text-saffron-300"
      >
        Try again
      </button>
    </RnCard>
  )
}
