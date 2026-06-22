'use client'

export default function RegistrationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="space-y-3 py-8">
      <p className="text-sm font-medium text-error">
        Failed to load registrations
        {process.env.NODE_ENV !== 'production' && error.message ? `: ${error.message}` : ''}
      </p>
      <button
        onClick={reset}
        className="text-xs text-text-muted underline hover:text-text-primary transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
