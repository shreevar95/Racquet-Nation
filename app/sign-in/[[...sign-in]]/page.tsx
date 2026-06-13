import { SignIn } from '@clerk/nextjs'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sign In' }

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="text-2xl font-black">
            <span className="text-brand-500">Racquet</span> Nation
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Sign in to manage your tournaments and matches.
          </p>
        </div>
        <SignIn
          forceRedirectUrl="/dashboard"
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'bg-surface-raised border border-border shadow-none rounded-lg',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
              formButtonPrimary:
                'bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium',
              footerActionLink: 'text-brand-400 hover:text-brand-300',
              formFieldInput:
                'bg-surface border border-border text-text-primary rounded-md focus:ring-brand-500 focus:border-brand-500',
              formFieldLabel: 'text-text-secondary text-sm',
            },
          }}
        />
      </div>
    </div>
  )
}
