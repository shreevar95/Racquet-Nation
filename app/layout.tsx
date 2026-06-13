import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Barlow_Condensed } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from 'sonner'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
})

const barlowCondensed = Barlow_Condensed({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['600', '700', '800', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Racquet Nation',
    template: '%s | Racquet Nation',
  },
  description:
    'The professional tournament and league platform for racquet sports. Live scores, standings, and schedules.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    siteName: 'Racquet Nation',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0f0f0f',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} ${barlowCondensed.variable} h-full`}
      >
        <body className="h-full min-h-screen bg-surface text-text-primary antialiased">
          {children}
          <Toaster
            position="top-center"
            theme="dark"
            toastOptions={{
              style: { background: '#1a1a1a', border: '1px solid #2e2e2e', color: '#f5f5f5' },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  )
}
