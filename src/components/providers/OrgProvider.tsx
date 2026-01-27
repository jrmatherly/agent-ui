'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from 'react'
import {
  useActiveOrganization,
  useListOrganizations,
  authClient
} from '@/lib/auth-client'

interface Organization {
  id: string
  name: string
  slug: string
  logo?: string
  parentOrgId?: string
}

interface Team {
  id: string
  name: string
  organizationId: string
}

interface OrgContextType {
  // Current context
  activeOrg: Organization | null
  activeBU: Organization | null
  activeTeam: Team | null

  // Available options
  organizations: Organization[]
  businessUnits: Organization[]
  teams: Team[]

  // Actions
  setActiveOrg: (orgId: string) => Promise<void>
  setActiveBU: (buId: string) => Promise<void>
  setActiveTeam: (teamId: string) => Promise<void>

  // Loading state
  isLoading: boolean
}

const OrgContext = createContext<OrgContextType | null>(null)

export function OrgProvider({ children }: { children: ReactNode }) {
  const { data: activeOrganization } = useActiveOrganization()
  const { data: organizations, isPending } = useListOrganizations()

  const [activeBU, setActiveBUState] = useState<Organization | null>(null)
  const [activeTeam, setActiveTeamState] = useState<Team | null>(null)
  const [teams, setTeams] = useState<Team[]>([])

  // Cast organizations to our interface
  const orgList = (organizations as Organization[] | undefined) || []

  // Derive business units (orgs with parentOrgId)
  const businessUnits = orgList.filter((org) => org.parentOrgId)
  const rootOrgs = orgList.filter((org) => !org.parentOrgId)

  const setActiveOrg = async (orgId: string) => {
    await authClient.organization.setActive({ organizationId: orgId })
  }

  const setActiveBU = async (buId: string) => {
    setActiveBUState(businessUnits.find((bu) => bu.id === buId) || null)
    // Load teams for this BU
    try {
      const result = await authClient.organization.listTeams({
        query: { organizationId: buId }
      })
      if (result.data) {
        setTeams(
          result.data.map((t) => ({
            id: t.id,
            name: t.name,
            organizationId: t.organizationId
          }))
        )
      } else {
        setTeams([])
      }
    } catch {
      setTeams([])
    }
  }

  const setActiveTeam = async (teamId: string) => {
    const team = teams.find((t) => t.id === teamId)
    setActiveTeamState(team || null)
  }

  // Reset BU and team when org changes
  useEffect(() => {
    setActiveBUState(null)
    setActiveTeamState(null)
    setTeams([])
  }, [activeOrganization?.id])

  return (
    <OrgContext.Provider
      value={{
        activeOrg: activeOrganization
          ? {
              id: activeOrganization.id,
              name: activeOrganization.name,
              slug: activeOrganization.slug,
              logo: activeOrganization.logo || undefined
            }
          : null,
        activeBU,
        activeTeam,
        organizations: rootOrgs,
        businessUnits,
        teams,
        setActiveOrg,
        setActiveBU,
        setActiveTeam,
        isLoading: isPending
      }}
    >
      {children}
    </OrgContext.Provider>
  )
}

export function useOrgContext() {
  const context = useContext(OrgContext)
  if (!context) {
    throw new Error('useOrgContext must be used within OrgProvider')
  }
  return context
}
