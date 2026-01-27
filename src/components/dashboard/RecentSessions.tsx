'use client'

import Link from 'next/link'
import { useStore } from '@/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp * 1000
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

export function RecentSessions() {
  const sessionsData = useStore((state) => state.sessionsData)

  const sessions = sessionsData?.slice(0, 5) ?? []

  if (sessions.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="mb-4 font-semibold">Recent Sessions</h3>
        <p className="text-muted-foreground text-sm">
          No recent sessions. Start a new chat to create one.
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Recent Sessions</h3>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/chat">View all</Link>
        </Button>
      </div>
      <div className="space-y-2">
        {sessions.map((session) => (
          <Link
            key={session.session_id}
            href={`/chat?session=${session.session_id}`}
            className="hover:bg-accent/50 flex items-center justify-between rounded-lg border p-3 transition-colors"
          >
            <span className="truncate font-medium">
              {session.session_name ||
                `Session ${session.session_id.slice(0, 8)}`}
            </span>
            <span className="text-muted-foreground ml-2 shrink-0 text-sm">
              {formatRelativeTime(session.created_at)}
            </span>
          </Link>
        ))}
      </div>
    </Card>
  )
}
