import { TopNavServer } from '@/components/layout/TopNavServer'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNavServer />
      <main className="flex-1">{children}</main>
    </div>
  )
}
