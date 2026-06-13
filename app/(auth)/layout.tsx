import { TopNav } from '@/components/layout/TopNav'
import { BottomNav } from '@/components/layout/BottomNav'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  )
}
