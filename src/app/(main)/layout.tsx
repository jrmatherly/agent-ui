import { ReactNode, Suspense } from 'react'
import { AppSidebar } from '@/components/layout/AppSidebar'

interface MainLayoutProps {
  children: ReactNode
}

function SidebarSkeleton() {
  return (
    <div className="bg-background h-screen w-64 shrink-0 animate-pulse px-2 py-3">
      <div className="bg-muted h-4 w-20 rounded" />
    </div>
  )
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="bg-background/80 flex h-screen">
      <Suspense fallback={<SidebarSkeleton />}>
        <AppSidebar />
      </Suspense>
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  )
}
