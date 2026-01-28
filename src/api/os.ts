import { toast } from 'sonner'

import { APIRoutes } from './routes'

import { AgentOSClientError, createAgentOSClient } from '@/lib/agentos'
import { AgentDetails, Sessions, TeamDetails } from '@/types/os'

export const getAgentsAPI = async (
  endpoint: string
): Promise<AgentDetails[]> => {
  const client = createAgentOSClient(endpoint)
  try {
    return await client.get<AgentDetails[]>('/agents')
  } catch (error) {
    if (error instanceof AgentOSClientError) {
      toast.error(`Failed to fetch agents: ${error.message}`)
    } else {
      toast.error('Error fetching agents')
    }
    return []
  }
}

export const getStatusAPI = async (base: string): Promise<number> => {
  try {
    const response = await fetch(APIRoutes.Status(base), {
      method: 'GET'
    })
    return response.status
  } catch {
    return 0
  }
}

export const getAllSessionsAPI = async (
  base: string,
  type: 'agent' | 'team' | 'workflow',
  componentId: string,
  dbId: string
): Promise<Sessions | { data: [] }> => {
  const client = createAgentOSClient(base)
  try {
    const params = new URLSearchParams({
      type,
      component_id: componentId,
      db_id: dbId
    })
    return await client.get<Sessions>(`/sessions?${params.toString()}`)
  } catch (error) {
    if (error instanceof AgentOSClientError && error.status === 404) {
      return { data: [] }
    }
    return { data: [] }
  }
}

export const getSessionAPI = async (
  base: string,
  type: 'agent' | 'team' | 'workflow',
  sessionId: string,
  dbId?: string
) => {
  const client = createAgentOSClient(base)
  const params = new URLSearchParams({ type })
  if (dbId) params.append('db_id', dbId)

  return client.get(`/sessions/${sessionId}/runs?${params.toString()}`)
}

export const deleteSessionAPI = async (
  base: string,
  dbId: string,
  sessionId: string
) => {
  const client = createAgentOSClient(base)
  const params = new URLSearchParams()
  if (dbId) params.append('db_id', dbId)

  return client.delete(`/sessions/${sessionId}?${params.toString()}`)
}

export const getTeamsAPI = async (endpoint: string): Promise<TeamDetails[]> => {
  const client = createAgentOSClient(endpoint)
  try {
    return await client.get<TeamDetails[]>('/teams')
  } catch (error) {
    if (error instanceof AgentOSClientError) {
      toast.error(`Failed to fetch teams: ${error.message}`)
    } else {
      toast.error('Error fetching teams')
    }
    return []
  }
}

export const deleteTeamSessionAPI = async (
  base: string,
  teamId: string,
  sessionId: string
) => {
  const client = createAgentOSClient(base)
  return client.delete(`/teams/${teamId}/sessions/${sessionId}`)
}

export async function cancelRunAPI(
  endpoint: string,
  entityType: 'agent' | 'team' | 'workflow',
  entityId: string,
  runId: string,
  authToken?: string
): Promise<void> {
  let url: string
  if (entityType === 'agent') {
    url = APIRoutes.CancelAgentRun(endpoint, entityId, runId)
  } else if (entityType === 'team') {
    url = APIRoutes.CancelTeamRun(endpoint, entityId, runId)
  } else {
    // Workflow cancellation not yet implemented
    throw new Error('Workflow run cancellation is not yet supported')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers
  })

  if (!response.ok) {
    throw new Error(`Failed to cancel run: ${response.statusText}`)
  }
}
