'use client'

import { ChatArea } from '@/components/chat/ChatArea'
import { Suspense } from 'react'

export default function ChatPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatArea />
    </Suspense>
  )
}
