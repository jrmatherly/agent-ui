'use client'

import { useOrgContext } from '@/components/providers/OrgProvider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Users } from 'lucide-react'

export function TeamSwitcher() {
  const { activeTeam, teams, setActiveTeam, isLoading } = useOrgContext()

  if (isLoading || teams.length === 0) {
    return null
  }

  return (
    <Select value={activeTeam?.id || ''} onValueChange={setActiveTeam}>
      <SelectTrigger className="w-[160px]">
        <Users className="mr-2 h-4 w-4" />
        <SelectValue placeholder="Team" />
      </SelectTrigger>
      <SelectContent>
        {teams.map((team) => (
          <SelectItem key={team.id} value={team.id}>
            {team.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
