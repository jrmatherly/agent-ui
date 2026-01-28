import { ReactNode, Suspense } from 'react'
import { AppSidebar } from '@/components/layout/AppSidebar'

interface MainLayoutProps {
  children: ReactNode
}

function SidebarSkeleton() {
  return (
    <div className="h-screen w-64 shrink-0 animate-pulse bg-background px-2 py-3">
      <div className="h-4 w-20 rounded bg-muted" />
    </div>
  )
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="bg-background/80 flex h-screen">
      <Suspense fallback={<SidebarSkeleton />}>
        <AppSidebar />
      </Suspense>
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
