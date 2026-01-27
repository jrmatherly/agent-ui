'use client'

import { useSession } from '@/lib/auth-client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UsageStats } from './UsageStats'
import { QuickActions } from './QuickActions'
import { PinnedAgents } from './PinnedAgents'
import { RecentSessions } from './RecentSessions'
import { TeamActivityFeed } from './TeamActivityFeed'
import { AdminMetrics } from './AdminMetrics'

const ADMIN_ROLES = ['orgAdmin', 'globalAdmin']

export function Dashboard() {
  const { data: session } = useSession()
  const user = session?.user
  const isAdmin = user?.role && ADMIN_ROLES.includes(user.role)

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome{user?.name ? `, ${user.name}` : ''}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s an overview of your activity
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {isAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <UsageStats />

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <QuickActions />
              </div>
              <div>
                <PinnedAgents />
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <RecentSessions />
              <TeamActivityFeed />
            </div>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin">
              <AdminMetrics />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
