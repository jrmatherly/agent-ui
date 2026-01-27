'use client'

import Link from 'next/link'
import { useStore } from '@/store'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export function PinnedAgents() {
  const agents = useStore((state) => state.agents)

  // Show first 3 agents as "pinned" (future: implement actual pinning)
  const displayAgents = agents?.slice(0, 3) ?? []

  if (displayAgents.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="mb-4 font-semibold">Agents</h3>
        <p className="text-muted-foreground text-sm">
          No agents available. Connect to AgentOS to see agents.
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h3 className="mb-4 font-semibold">Agents</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {displayAgents.map((agent) => (
          <Link
            key={agent.id}
            href={`/chat?agent=${agent.id}`}
            className="hover:bg-accent/50 flex items-center gap-3 rounded-lg border p-3 transition-colors"
          >
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {(agent.name ?? agent.id).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{agent.name ?? agent.id}</p>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  )
}
