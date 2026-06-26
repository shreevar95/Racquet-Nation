import { Show } from '@clerk/nextjs'
import { TopNavServer } from '@/components/layout/TopNavServer'
import { BottomNav } from '@/components/layout/BottomNav'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNavServer />
      <main className="flex-1 pb-20">{children}</main>
      <Show when="signed-in">
        <BottomNav />
      </Show>
    </div>
  )
}
