import { useCallback } from 'react'
import { useStore } from '@/store'
import { APIRoutes } from '@/api/routes'
import { constructEndpointUrl } from '@/lib/constructEndpointUrl'
import type { HITLTool, HITLContinuePayload } from '@/types/os'

export function useHITLHandler() {
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)
  const setPausedRun = useStore((state) => state.setPausedRun)

  const continueRun = useCallback(
    async (
      agentId: string,
      runId: string,
      sessionId: string,
      tool: HITLTool,
      confirmed: boolean
    ) => {
      const endpointUrl = constructEndpointUrl(selectedEndpoint)
      const url = APIRoutes.ContinueRun(endpointUrl, agentId, runId)

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`
      }

      const payload: HITLContinuePayload = {
        tools: [
          {
            tool_call_id: tool.tool_call_id,
            tool_name: tool.tool_name,
            tool_args: tool.tool_args,
            confirmed
          }
        ],
        session_id: sessionId,
        stream: true
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        setPausedRun(null)
      }

      return response
    },
    [selectedEndpoint, authToken, setPausedRun]
  )

  const confirmTool = useCallback(
    async (
      agentId: string,
      runId: string,
      sessionId: string,
      tool: HITLTool
    ) => {
      return continueRun(agentId, runId, sessionId, tool, true)
    },
    [continueRun]
  )

  const rejectTool = useCallback(
    async (
      agentId: string,
      runId: string,
      sessionId: string,
      tool: HITLTool
    ) => {
      return continueRun(agentId, runId, sessionId, tool, false)
    },
    [continueRun]
  )

  return { confirmTool, rejectTool }
}
