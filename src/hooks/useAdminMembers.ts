'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

export interface AdminMember {
  id: string
  name: string
  email: string
  role: string
  department?: string
  jobTitle?: string
  ssoProvider?: string
  ssoLastSync?: string
  banned: boolean
  createdAt: string
  image?: string
  lastActiveAt?: string
}

export interface MembersFilters {
  search?: string
  role?: string
  sso?: boolean
  page: number
  limit: number
}

interface MembersResponse {
  members: AdminMember[]
  total: number
  page: number
  limit: number
}

async function fetchMembers(filters: MembersFilters): Promise<MembersResponse> {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.role && filters.role !== 'all') params.set('role', filters.role)
  if (filters.sso) params.set('sso', 'true')
  params.set('page', String(filters.page))
  params.set('limit', String(filters.limit))

  const response = await fetch(`/api/admin/members?${params}`)
  if (!response.ok) throw new Error('Failed to fetch members')
  return response.json()
}

export function useAdminMembers(initialFilters?: Partial<MembersFilters>) {
  const [filters, setFilters] = useState<MembersFilters>({
    page: 1,
    limit: 50,
    ...initialFilters
  })

  const query = useQuery({
    queryKey: ['adminMembers', filters],
    queryFn: () => fetchMembers(filters),
    staleTime: 30000
  })

  return {
    ...query,
    filters,
    setFilters,
    setPage: (page: number) => setFilters((f) => ({ ...f, page })),
    setSearch: (search: string) =>
      setFilters((f) => ({ ...f, search, page: 1 })),
    setRole: (role: string) => setFilters((f) => ({ ...f, role, page: 1 }))
  }
}
