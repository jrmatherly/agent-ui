'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { useUIPermissions } from '@/hooks/useUIPermissions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AuditLogViewer } from './AuditLogViewer'
import { PermissionGate } from '@/components/enterprise/common/PermissionGate'
import { useAdminMetrics } from '@/hooks/useAdminMetrics'
import { useAdminMembers } from '@/hooks/useAdminMembers'
import { useAdminAgents } from '@/hooks/useAdminAgents'
import { useAdminUsage } from '@/hooks/useAdminUsage'
import { useAdminSystem } from '@/hooks/useAdminSystem'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  Activity,
  Bot,
  MessageSquare,
  Clock,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'

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
          <UsageMetricsTab />
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

function AdminOverview() {
  const { data: metrics, isLoading, error } = useAdminMetrics()

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !metrics) {
    return (
      <div className="border-destructive/50 bg-destructive/10 rounded-lg border p-4">
        <p className="text-destructive">Failed to load metrics</p>
      </div>
    )
  }

  const cards = [
    { title: 'Total Users', value: metrics.totalUsers, icon: Users },
    { title: 'Active Users (24h)', value: metrics.activeUsers, icon: Activity },
    { title: 'Total Agents', value: metrics.totalAgents, icon: Bot },
    {
      title: 'Total Sessions',
      value: metrics.totalSessions,
      icon: MessageSquare
    },
    {
      title: 'Avg Session Duration',
      value: metrics.avgSessionDuration,
      icon: Clock
    },
    { title: 'Error Rate', value: metrics.errorRate, icon: AlertTriangle }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              {card.title}
            </CardTitle>
            <card.icon className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function MemberManagement() {
  const { data, isLoading, filters, setSearch, setRole, setPage } =
    useAdminMembers()

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleDateString()
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Input
          placeholder="Search by name or email..."
          value={filters.search || ''}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={filters.role || 'all'} onValueChange={setRole}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="powerUser">Power User</SelectItem>
            <SelectItem value="teamLead">Team Lead</SelectItem>
            <SelectItem value="teamAdmin">Team Admin</SelectItem>
            <SelectItem value="orgAdmin">Org Admin</SelectItem>
            <SelectItem value="globalAdmin">Global Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>SSO</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : data?.members.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground py-8 text-center"
                >
                  No members found
                </TableCell>
              </TableRow>
            ) : (
              data?.members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {member.image && <AvatarImage src={member.image} />}
                        <AvatarFallback>
                          {member.name?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{member.role}</Badge>
                  </TableCell>
                  <TableCell>{member.department || '-'}</TableCell>
                  <TableCell>
                    {member.ssoProvider ? (
                      <Badge variant="secondary">{member.ssoProvider}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(member.lastActiveAt)}</TableCell>
                  <TableCell>
                    {member.banned ? (
                      <Badge variant="destructive">Banned</Badge>
                    ) : (
                      <Badge variant="default">Active</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {data?.total ? `${data.total} total members` : ''}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page <= 1}
            onClick={() => setPage(filters.page - 1)}
          >
            Previous
          </Button>
          <span className="px-3 py-2 text-sm">Page {filters.page}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={!data || data.members.length < filters.limit}
            onClick={() => setPage(filters.page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

function AgentManagement() {
  const { data, isLoading } = useAdminAgents()

  const formatDate = (date: string | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleDateString()
  }

  if (isLoading) {
    return <div className="p-4">Loading agents...</div>
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Agent</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Total Sessions</TableHead>
            <TableHead>Active Sessions</TableHead>
            <TableHead>Last Used</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.agents.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-muted-foreground py-8 text-center"
              >
                No agents configured
              </TableCell>
            </TableRow>
          ) : (
            data?.agents.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Bot className="text-muted-foreground h-4 w-4" />
                    <span className="font-medium">
                      {agent.name || agent.id}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {agent.model?.model || agent.model?.provider || '-'}
                </TableCell>
                <TableCell>{agent.sessionStats.total}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      agent.sessionStats.active > 0 ? 'default' : 'secondary'
                    }
                  >
                    {agent.sessionStats.active}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(agent.sessionStats.lastUsed)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function UsageMetricsTab() {
  const { data, isLoading } = useAdminUsage()

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  if (isLoading) {
    return <div className="p-4">Loading usage metrics...</div>
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-semibold">Session Activity</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm">
                Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.sessions.today}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm">
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.sessions.thisWeek}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm">
                This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.sessions.thisMonth}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm">
                Avg Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {data.sessions.avgMessageCount}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Users</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm">
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.users.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm">
                New This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.users.newThisWeek}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm">
                Role Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                {Object.entries(data.users.byRole).map(([role, count]) => (
                  <div key={role} className="flex justify-between">
                    <span className="text-muted-foreground">{role}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Knowledge Bases</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm">
                Total Bases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.knowledge.totalBases}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm">
                Total Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {data.knowledge.totalDocuments}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm">
                Storage Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatBytes(data.knowledge.totalSizeBytes)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function SystemSettings() {
  const { data, isLoading, refetch } = useAdminSystem()

  if (isLoading) {
    return <div className="p-4">Loading system info...</div>
  }

  if (!data) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500'
      case 'unhealthy':
        return 'text-red-500'
      default:
        return 'text-yellow-500'
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            System Health
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>AgentOS Backend</span>
              <div className="flex items-center gap-2">
                <span className={getStatusColor(data.health.agentOS.status)}>
                  {data.health.agentOS.status}
                </span>
                {data.health.agentOS.latency !== undefined &&
                  data.health.agentOS.latency > 0 && (
                    <span className="text-muted-foreground text-sm">
                      ({data.health.agentOS.latency}ms)
                    </span>
                  )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Database</span>
              <span className={getStatusColor(data.health.database.status)}>
                {data.health.database.status}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">AgentOS URL</span>
              <code className="bg-muted rounded px-2 py-1 text-sm">
                {data.config.agentOSUrl}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">SSO Providers</span>
              <span>{data.config.ssoProvidersCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Webhooks</span>
              <span>{data.config.webhooksCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Version Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">App Version</span>
              <span>{data.version.app}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Node.js</span>
              <span>{data.version.node}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
