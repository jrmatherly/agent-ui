'use client'

import { Card } from '@/components/ui/card'

export function TeamActivityFeed() {
  // Team activity feed requires a dedicated activity API
  // For now, show empty state
  return (
    <Card className="p-6">
      <h3 className="mb-4 font-semibold">Team Activity</h3>
      <p className="text-muted-foreground text-sm">No recent team activity.</p>
    </Card>
  )
}
