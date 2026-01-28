'use client'

import { useStore } from '@/store'
import { useQueryState } from 'nuqs'
import useChatActions from '@/hooks/useChatActions'
import { Bot, Users, Workflow } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ModeSelector() {
  const { mode, setMode, setMessages, setSelectedModel } = useStore()
  const { clearChat } = useChatActions()
  const [, setAgentId] = useQueryState('agent')
  const [, setTeamId] = useQueryState('team')
  const [, setWorkflowId] = useQueryState('workflow')
  const [, setSessionId] = useQueryState('session')

  const handleModeChange = (newMode: 'agent' | 'team' | 'workflow') => {
    if (newMode === mode) return

    setMode(newMode)

    setAgentId(null)
    setTeamId(null)
    setWorkflowId(null)
    setSelectedModel('')
    setMessages([])
    setSessionId(null)
    clearChat()
  }

  const buttonClass = (buttonMode: 'agent' | 'team' | 'workflow') =>
    cn(
      'flex flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-medium uppercase transition-all',
      mode === buttonMode
        ? 'bg-background text-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground'
    )

  return (
    <div className="bg-secondary border-primary/15 flex h-9 w-full rounded-xl border p-1">
      <button
        onClick={() => handleModeChange('agent')}
        className={buttonClass('agent')}
      >
        <Bot className="h-3.5 w-3.5" />
        Agent
      </button>
      <button
        onClick={() => handleModeChange('team')}
        className={buttonClass('team')}
      >
        <Users className="h-3.5 w-3.5" />
        Team
      </button>
      <button
        onClick={() => handleModeChange('workflow')}
        className={buttonClass('workflow')}
      >
        <Workflow className="h-3.5 w-3.5" />
        Workflow
      </button>
    </div>
  )
}
