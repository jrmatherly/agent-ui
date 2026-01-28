'use client'

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select'
import { useStore } from '@/store'
import { useQueryState } from 'nuqs'
import Icon from '@/components/ui/icon'
import { useEffect } from 'react'
import useChatActions from '@/hooks/useChatActions'
import type { AgentDetails, TeamDetails, WorkflowDetails } from '@/types/os'

type EntityType = AgentDetails | TeamDetails | WorkflowDetails

export function EntitySelector() {
  const { mode, agents, teams, workflows, setMessages, setSelectedModel } =
    useStore()

  const { focusChatInput } = useChatActions()
  const [agentId, setAgentId] = useQueryState('agent', {
    parse: (value) => value || undefined,
    history: 'push'
  })
  const [teamId, setTeamId] = useQueryState('team', {
    parse: (value) => value || undefined,
    history: 'push'
  })
  const [workflowId, setWorkflowId] = useQueryState('workflow', {
    parse: (value) => value || undefined,
    history: 'push'
  })
  const [, setSessionId] = useQueryState('session')

  const getCurrentEntities = (): EntityType[] => {
    switch (mode) {
      case 'team':
        return teams
      case 'workflow':
        return workflows
      default:
        return agents
    }
  }

  const getCurrentValue = (): string | undefined => {
    switch (mode) {
      case 'team':
        return teamId ?? undefined
      case 'workflow':
        return workflowId ?? undefined
      default:
        return agentId ?? undefined
    }
  }

  const getPlaceholder = (): string => {
    switch (mode) {
      case 'team':
        return 'Select Team'
      case 'workflow':
        return 'Select Workflow'
      default:
        return 'Select Agent'
    }
  }

  const currentEntities = getCurrentEntities()
  const currentValue = getCurrentValue()
  const placeholder = getPlaceholder()

  useEffect(() => {
    if (currentValue && currentEntities.length > 0) {
      const entity = currentEntities.find((item) => item.id === currentValue)
      if (entity) {
        setSelectedModel(entity.model?.model || '')
        if (mode === 'team') {
          setTeamId(entity.id)
        } else if (mode === 'workflow') {
          setWorkflowId(entity.id)
        }
        if (entity.model?.model) {
          focusChatInput()
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentValue, currentEntities, setSelectedModel, mode])

  const handleOnValueChange = (value: string) => {
    const newValue = value === currentValue ? null : value
    const selectedEntity = currentEntities.find((item) => item.id === newValue)

    setSelectedModel(selectedEntity?.model?.model || '')

    // Clear all entity selections first
    setAgentId(null)
    setTeamId(null)
    setWorkflowId(null)

    // Set the selected entity based on mode
    switch (mode) {
      case 'team':
        setTeamId(newValue)
        break
      case 'workflow':
        setWorkflowId(newValue)
        break
      default:
        setAgentId(newValue)
    }

    setMessages([])
    setSessionId(null)

    if (selectedEntity?.model?.model) {
      focusChatInput()
    }
  }

  if (currentEntities.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger className="border-primary/15 bg-secondary h-9 w-full rounded-xl border text-xs font-medium uppercase opacity-50">
          <SelectValue placeholder={`No ${mode}s Available`} />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <Select
      value={currentValue || ''}
      onValueChange={(value) => handleOnValueChange(value)}
    >
      <SelectTrigger className="border-primary/15 bg-secondary h-9 w-full rounded-xl border text-xs font-medium uppercase">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-popover text-popover-foreground font-dmmono border-none shadow-lg">
        {currentEntities.map((entity, index) => (
          <SelectItem
            className="cursor-pointer py-2.5"
            key={`${entity.id}-${index}`}
            value={entity.id}
          >
            <div className="flex items-center gap-3">
              <Icon type={'user'} size="xs" />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium uppercase">
                  {entity.name || entity.id}
                </span>
                {entity.model?.model && (
                  <span className="text-muted-foreground text-[10px] font-normal normal-case">
                    {entity.model.model}
                  </span>
                )}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
