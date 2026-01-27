'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { useUIPermissions } from '@/hooks/useUIPermissions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AuditLogViewer } from './AuditLogViewer'
import { PermissionGate } from '@/components/enterprise/common/PermissionGate'

export function AdminDashboard() {
  const { role: _role } = useAuth()
  const _permissions = useUIPermissions()

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold">Administration</h1>
        <p className="text-muted-foreground">
          Manage your organization, teams, and agents
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>

          <PermissionGate permission="member:invite">
            <TabsTrigger value="members">Members</TabsTrigger>
          </PermissionGate>

          <TabsTrigger value="agents">Agents</TabsTrigger>

          <PermissionGate permission="team:manage">
            <TabsTrigger value="usage">Usage</TabsTrigger>
          </PermissionGate>

          <PermissionGate permission="audit:view:bu">
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          </PermissionGate>

          <PermissionGate role="globalAdmin">
            <TabsTrigger value="system">System</TabsTrigger>
          </PermissionGate>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <AdminOverview />
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <MemberManagement />
        </TabsContent>

        <TabsContent value="agents" className="mt-6">
          <AgentManagement />
        </TabsContent>

        <TabsContent value="usage" className="mt-6">
          <UsageMetrics />
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <AuditLogViewer />
        </TabsContent>

        <TabsContent value="system" className="mt-6">
          <SystemSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Placeholder components - to be implemented in subsequent tasks
function AdminOverview() {
  return (
    <div className="rounded-lg border p-4">Admin Overview - Coming soon</div>
  )
}

function MemberManagement() {
  return (
    <div className="rounded-lg border p-4">Member Management - Coming soon</div>
  )
}

function AgentManagement() {
  return (
    <div className="rounded-lg border p-4">Agent Management - Coming soon</div>
  )
}

function UsageMetrics() {
  return (
    <div className="rounded-lg border p-4">Usage Metrics - Coming soon</div>
  )
}

function SystemSettings() {
  return (
    <div className="rounded-lg border p-4">System Settings - Coming soon</div>
  )
}
