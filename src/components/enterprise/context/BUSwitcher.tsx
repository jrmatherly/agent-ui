'use client'

import { useOrgContext } from '@/components/providers/OrgProvider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Building } from 'lucide-react'

export function BUSwitcher() {
  const { activeBU, businessUnits, setActiveBU, isLoading } = useOrgContext()

  if (isLoading || businessUnits.length === 0) {
    return null
  }

  return (
    <Select value={activeBU?.id || ''} onValueChange={setActiveBU}>
      <SelectTrigger className="w-[180px]">
        <Building className="mr-2 h-4 w-4" />
        <SelectValue placeholder="Business Unit" />
      </SelectTrigger>
      <SelectContent>
        {businessUnits.map((bu) => (
          <SelectItem key={bu.id} value={bu.id}>
            {bu.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
