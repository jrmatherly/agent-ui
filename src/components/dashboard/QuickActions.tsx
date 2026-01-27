'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function QuickActions() {
  return (
    <Card className="p-6">
      <h3 className="mb-4 font-semibold">Quick Actions</h3>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/chat">New Chat</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/knowledge">Knowledge Base</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/profile">Settings</Link>
        </Button>
      </div>
    </Card>
  )
}
