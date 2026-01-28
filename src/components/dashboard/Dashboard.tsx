'use client'

import { useEffect, useRef } from 'react'
import { useSession } from '@/lib/auth-client'
import { useStore } from '@/store'
import useChatActions from '@/hooks/useChatActions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QuickActions } from './QuickActions'
import { PinnedAgents } from './PinnedAgents'
import { RecentSessions } from './RecentSessions'
import { TeamActivityFeed } from './TeamActivityFeed'
import { AdminMetrics } from './AdminMetrics'
import { getVisibleTabs } from './tabConfig'
import type { Role } from '@/lib/permissions'

// Default AgentOS endpoint
const DEFAULT_ENDPOINT =
  process.env.NEXT_PUBLIC_AGENT_OS_URL || 'http://localhost:8000'

export function Dashboard() {
  const { data: session } = useSession()
  const user = session?.user
  const userRole = (user?.role as Role) || undefined
  const { initialize } = useChatActions()
  const hydrated = useStore((state) => state.hydrated)
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const setSelectedEndpoint = useStore((state) => state.setSelectedEndpoint)
  const hasInitialized = useRef(false)

  // Get visible tabs based on user role
  const visibleTabs = getVisibleTabs(userRole)

  // Ensure endpoint is set to a valid value after hydration
  useEffect(() => {
    if (hydrated && !selectedEndpoint) {
      setSelectedEndpoint(DEFAULT_ENDPOINT)
    }
  }, [hydrated, selectedEndpoint, setSelectedEndpoint])

  // Initialize connection to AgentOS when Dashboard mounts
  useEffect(() => {
    if (hydrated && selectedEndpoint && !hasInitialized.current) {
      hasInitialized.current = true
      initialize()
    }
  }, [hydrated, selectedEndpoint, initialize])

  return (
    <div className="bg-background min-h-0 flex-1 overflow-y-auto">
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
            {visibleTabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <PinnedAgents />
              </div>
              <div>
                <QuickActions />
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <RecentSessions />
              <TeamActivityFeed />
            </div>
          </TabsContent>

          {visibleTabs.some((t) => t.id === 'team') && (
            <TabsContent value="team">
              <div className="rounded-lg border p-6">
                <h3 className="font-semibold">Team Management</h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  Team management features coming soon.
                </p>
              </div>
            </TabsContent>
          )}

          {visibleTabs.some((t) => t.id === 'analytics') && (
            <TabsContent value="analytics">
              <div className="rounded-lg border p-6">
                <h3 className="font-semibold">Analytics</h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  Analytics dashboard coming soon.
                </p>
              </div>
            </TabsContent>
          )}

          {visibleTabs.some((t) => t.id === 'admin') && (
            <TabsContent value="admin">
              <AdminMetrics />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
