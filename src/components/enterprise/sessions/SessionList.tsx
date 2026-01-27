'use client'

import {
  useSessions,
  type SessionFilter,
  type Session
} from '@/hooks/useSessions'
import { useUIPermissions } from '@/hooks/useUIPermissions'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Lock, Users, Share, MoreHorizontal } from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export function SessionList() {
  const { sessions, filter, setFilter, isLoading, isOwner } = useSessions()
  const permissions = useUIPermissions()

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as SessionFilter)}>
        <TabsList>
          <TabsTrigger value="mine">My Sessions</TabsTrigger>
          <TabsTrigger value="shared">Shared with Me</TabsTrigger>
          {permissions.data.showTeamSessions && (
            <TabsTrigger value="team">Team Sessions</TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      {/* Session list */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-muted-foreground py-8 text-center">
            Loading...
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center">
            No sessions found
          </div>
        ) : (
          sessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              isOwner={isOwner(session)}
              showOwner={filter !== 'mine'}
              canShare={permissions.actions.shareSession}
            />
          ))
        )}
      </div>
    </div>
  )
}

interface SessionRowProps {
  session: Session
  isOwner: boolean
  showOwner: boolean
  canShare: boolean
}

function SessionRow({
  session,
  isOwner,
  showOwner,
  canShare
}: SessionRowProps) {
  const { shareSession, unshareSession } = useSessions()

  const handleShare = async () => {
    if (session.teamId) {
      await shareSession({ sessionId: session.id, teamId: session.teamId })
    }
  }

  const handleUnshare = async () => {
    await unshareSession(session.id)
  }

  return (
    <div className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3 transition-colors">
      <div className="flex items-center gap-3">
        {/* Privacy indicator */}
        {session.visibility === 'private' ? (
          <Lock className="text-muted-foreground h-4 w-4" />
        ) : (
          <Users className="h-4 w-4 text-blue-500" />
        )}

        <div>
          <p className="font-medium">{session.name || 'Untitled Session'}</p>
          <p className="text-muted-foreground text-sm">
            {session.entityName} • {dayjs(session.updatedAt).fromNow()}
            {showOwner && ` • ${session.ownerName}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Read-only indicator for non-owners */}
        {!isOwner && <Badge variant="secondary">View Only</Badge>}

        {/* Actions for owners */}
        {isOwner && canShare && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {session.visibility === 'private' ? (
                <DropdownMenuItem onClick={handleShare}>
                  <Share className="mr-2 h-4 w-4" />
                  Share with Team
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleUnshare}>
                  <Lock className="mr-2 h-4 w-4" />
                  Make Private
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}
