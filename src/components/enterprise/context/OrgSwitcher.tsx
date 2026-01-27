'use client'

import { useOrgContext } from '@/components/providers/OrgProvider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Building2 } from 'lucide-react'

export function OrgSwitcher() {
  const { activeOrg, organizations, setActiveOrg, isLoading } = useOrgContext()

  if (isLoading) {
    return <div className="bg-muted h-9 w-[200px] animate-pulse rounded-md" />
  }

  if (organizations.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Building2 className="h-4 w-4" />
        <span className="font-medium">{activeOrg?.name || 'Organization'}</span>
      </div>
    )
  }

  return (
    <Select value={activeOrg?.id} onValueChange={setActiveOrg}>
      <SelectTrigger className="w-[200px]">
        <Building2 className="mr-2 h-4 w-4" />
        <SelectValue placeholder="Select organization" />
      </SelectTrigger>
      <SelectContent>
        {organizations.map((org) => (
          <SelectItem key={org.id} value={org.id}>
            {org.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
