'use client'

import { Suspense } from 'react'
import { Dashboard } from '@/components/dashboard/Dashboard'

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent" />
        </div>
      }
    >
      <Dashboard />
    </Suspense>
  )
}
