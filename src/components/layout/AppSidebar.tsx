'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/chat/Sidebar/Sidebar'

export function AppSidebar() {
  const pathname = usePathname()

  // Only show full chat controls on /chat route
  const showChatControls = pathname === '/chat' || pathname.startsWith('/chat/')

  return <Sidebar showChatControls={showChatControls} />
}
