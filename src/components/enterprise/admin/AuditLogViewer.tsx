'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import type { AuditCategory, AuditSeverity } from '@/lib/audit/types'

interface AuditFilters {
  category?: AuditCategory | 'all'
  severity?: AuditSeverity | 'all'
  search?: string
  page: number
  limit: number
}

interface AuditLogResponse {
  logs: Array<{
    id: string
    timestamp: string
    actorType: string
    actorId: string
    actorEmail?: string
    actorRole?: string
    action: string
    category: string
    severity: string
    resourceType?: string
    resourceId?: string
    resourceName?: string
    outcome: string
    elevated?: boolean
  }>
  total: number
  hasMore: boolean
}

async function fetchAuditLogs(
  filters: AuditFilters
): Promise<AuditLogResponse> {
  const params = new URLSearchParams()
  if (filters.category && filters.category !== 'all') {
    params.set('category', filters.category)
  }
  if (filters.severity && filters.severity !== 'all') {
    params.set('severity', filters.severity)
  }
  if (filters.search) {
    params.set('search', filters.search)
  }
  params.set('page', String(filters.page))
  params.set('limit', String(filters.limit))

  const response = await fetch(`/api/admin/audit-logs?${params}`)
  if (!response.ok) throw new Error('Failed to fetch audit logs')
  return response.json()
}

export function AuditLogViewer() {
  const [filters, setFilters] = useState<AuditFilters>({
    category: 'all',
    severity: 'all',
    search: '',
    page: 1,
    limit: 50
  })

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => fetchAuditLogs(filters)
  })

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive'
      case 'warning':
        return 'warning'
      default:
        return 'secondary'
    }
  }

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'denied':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select
          value={filters.category}
          onValueChange={(v) =>
            setFilters({
              ...filters,
              category: v as AuditCategory | 'all',
              page: 1
            })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="authentication">Authentication</SelectItem>
            <SelectItem value="authorization">Authorization</SelectItem>
            <SelectItem value="agent_execution">Agent Execution</SelectItem>
            <SelectItem value="data_access">Data Access</SelectItem>
            <SelectItem value="configuration">Configuration</SelectItem>
            <SelectItem value="membership">Membership</SelectItem>
            <SelectItem value="admin_action">Admin Actions</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.severity}
          onValueChange={(v) =>
            setFilters({
              ...filters,
              severity: v as AuditSeverity | 'all',
              page: 1
            })
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Search user, action, resource..."
          value={filters.search}
          onChange={(e) =>
            setFilters({ ...filters, search: e.target.value, page: 1 })
          }
          className="w-[300px]"
        />

        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Outcome</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : data?.logs?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground py-8 text-center"
                >
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              data?.logs?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm">
                    {formatTimestamp(log.timestamp)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>
                          {log.actorEmail?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {log.actorEmail || log.actorId}
                      </span>
                      {log.elevated && (
                        <Badge variant="warning" className="text-xs">
                          Elevated
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getSeverityVariant(log.severity)}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.resourceType && (
                      <span>
                        {log.resourceType}: {log.resourceName || log.resourceId}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{getOutcomeIcon(log.outcome)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {data?.total ? `${data.total} total events` : ''}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page <= 1}
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">Page {filters.page}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={!data?.hasMore}
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
