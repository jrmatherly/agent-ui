import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStore } from '@/store'
import { APIRoutes } from '@/api/routes'
import { constructEndpointUrl } from '@/lib/constructEndpointUrl'
import type { Workflow, WorkflowStep } from '@/types/os'

export interface WorkflowListResponse {
  data: Workflow[]
  total: number
}

export interface WorkflowRunInput {
  workflowId: string
  message: string
  sessionId?: string
  stream?: boolean
}

export interface WorkflowRunResponse {
  run_id: string
  session_id: string
  status: 'running' | 'completed' | 'failed'
  steps?: WorkflowStep[]
}

export function useWorkflows() {
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)

  return useQuery<Workflow[]>({
    queryKey: ['workflows', selectedEndpoint],
    queryFn: async () => {
      const endpointUrl = constructEndpointUrl(selectedEndpoint)
      const url = APIRoutes.GetWorkflows(endpointUrl)

      const headers: Record<string, string> = {}
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`
      }

      const res = await fetch(url, { headers })
      if (!res.ok) {
        throw new Error('Failed to fetch workflows')
      }

      const data = await res.json()
      // Handle both array response and paginated response
      return Array.isArray(data) ? data : (data.data ?? [])
    },
    enabled: !!selectedEndpoint
  })
}

export function useWorkflowRun() {
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)
  const queryClient = useQueryClient()

  return useMutation<WorkflowRunResponse, Error, WorkflowRunInput>({
    mutationFn: async ({ workflowId, message, sessionId, stream = true }) => {
      const endpointUrl = constructEndpointUrl(selectedEndpoint)
      const url = APIRoutes.WorkflowRun(endpointUrl, workflowId)

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message,
          session_id: sessionId,
          stream
        })
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Failed to run workflow')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    }
  })
}
