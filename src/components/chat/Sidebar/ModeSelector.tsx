'use client'

import { useStore } from '@/store'
import { useQueryState } from 'nuqs'
import useChatActions from '@/hooks/useChatActions'
import { Bot, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ModeSelector() {
  const { mode, setMode, setMessages, setSelectedModel } = useStore()
  const { clearChat } = useChatActions()
  const [, setAgentId] = useQueryState('agent')
  const [, setTeamId] = useQueryState('team')
  const [, setSessionId] = useQueryState('session')

  const handleModeChange = (newMode: 'agent' | 'team') => {
    if (newMode === mode) return

    setMode(newMode)

    setAgentId(null)
    setTeamId(null)
    setSelectedModel('')
    setMessages([])
    setSessionId(null)
    clearChat()
  }

  return (
    <div className="bg-secondary border-primary/15 flex h-9 w-full rounded-xl border p-1">
      <button
        onClick={() => handleModeChange('agent')}
        className={cn(
          'flex flex-1 items-center justify-center gap-2 rounded-lg text-xs font-medium uppercase transition-all',
          mode === 'agent'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Bot className="h-3.5 w-3.5" />
        Agent
      </button>
      <button
        onClick={() => handleModeChange('team')}
        className={cn(
          'flex flex-1 items-center justify-center gap-2 rounded-lg text-xs font-medium uppercase transition-all',
          mode === 'team'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Users className="h-3.5 w-3.5" />
        Team
      </button>
    </div>
  )
}
