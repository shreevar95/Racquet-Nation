import { redirect } from 'next/navigation'
import { requirePlatformAdmin } from '@/lib/auth'
import { TopNavServer } from '@/components/layout/TopNavServer'
import { AdminSidebarNav } from './AdminSidebarNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin().catch(() => redirect('/dashboard'))

  return (
    <div className="flex min-h-screen flex-col bg-paper font-nunito">
      <TopNavServer />
      <div className="flex flex-1">
        {/* Sidebar (desktop only) */}
        <aside className="hidden w-56 shrink-0 flex-col gap-1 border-r border-rn-border bg-rn-card p-4 md:flex">
          <p className="mb-2 px-3 text-xs font-extrabold uppercase tracking-wider text-rn-text-muted">
            Platform Admin
          </p>
          <AdminSidebarNav />
        </aside>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
