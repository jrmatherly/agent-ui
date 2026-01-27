import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { SlackClient } from '@/lib/integrations/slack'

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { webhookUrl, testMessage } = await request.json()

  if (!webhookUrl) {
    return NextResponse.json({ error: 'Webhook URL required' }, { status: 400 })
  }

  const client = new SlackClient(webhookUrl)

  const success = await client.sendMessage({
    channel: '#test',
    text: testMessage || 'Test message from Agent UI'
  })

  if (success) {
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
}
