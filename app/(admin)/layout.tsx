import { redirect } from 'next/navigation'
import { requirePlatformAdmin } from '@/lib/auth'
import { TopNav } from '@/components/layout/TopNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin().catch(() => redirect('/dashboard'))

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <div className="flex flex-1">
        {/* Sidebar (desktop only) */}
        <aside className="hidden md:flex w-56 flex-col border-r border-border bg-surface-raised p-4 gap-1 shrink-0">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 px-2">
            Platform Admin
          </p>
          <nav className="flex flex-col gap-0.5">
            <a href="/admin" className="px-3 py-2 rounded-md text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors">
              Overview
            </a>
            <a href="/admin/tournaments" className="px-3 py-2 rounded-md text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors">
              Tournaments
            </a>
            <a href="/admin/users" className="px-3 py-2 rounded-md text-sm text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors">
              Users
            </a>
          </nav>
        </aside>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
