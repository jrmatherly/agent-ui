export const APIRoutes = {
  GetAgents: (agentOSUrl: string) => `${agentOSUrl}/agents`,
  AgentRun: (agentOSUrl: string) => `${agentOSUrl}/agents/{agent_id}/runs`,
  Status: (agentOSUrl: string) => `${agentOSUrl}/health`,
  GetSessions: (agentOSUrl: string) => `${agentOSUrl}/sessions`,
  GetSession: (agentOSUrl: string, sessionId: string) =>
    `${agentOSUrl}/sessions/${sessionId}/runs`,

  DeleteSession: (agentOSUrl: string, sessionId: string) =>
    `${agentOSUrl}/sessions/${sessionId}`,

  GetTeams: (agentOSUrl: string) => `${agentOSUrl}/teams`,
  TeamRun: (agentOSUrl: string, teamId: string) =>
    `${agentOSUrl}/teams/${teamId}/runs`,
  CancelAgentRun: (agentOSUrl: string, agentId: string, runId: string) =>
    `${agentOSUrl}/agents/${agentId}/runs/${runId}/cancel`,
  CancelTeamRun: (agentOSUrl: string, teamId: string, runId: string) =>
    `${agentOSUrl}/teams/${teamId}/runs/${runId}/cancel`,
  DeleteTeamSession: (agentOSUrl: string, teamId: string, sessionId: string) =>
    `${agentOSUrl}/v1//teams/${teamId}/sessions/${sessionId}`,

  // Knowledge API
  KnowledgeUpload: (agentOSUrl: string) => `${agentOSUrl}/knowledge/content`,
  KnowledgeSearch: (agentOSUrl: string) => `${agentOSUrl}/knowledge/search`,
  KnowledgeContent: (agentOSUrl: string, contentId: string) =>
    `${agentOSUrl}/knowledge/content/${contentId}`,
  KnowledgeContentStatus: (agentOSUrl: string, contentId: string) =>
    `${agentOSUrl}/knowledge/content/${contentId}/status`,
  KnowledgeConfig: (agentOSUrl: string) => `${agentOSUrl}/knowledge/config`,

  // Workflow API
  GetWorkflows: (agentOSUrl: string) => `${agentOSUrl}/workflows`,
  WorkflowRun: (agentOSUrl: string, workflowId: string) =>
    `${agentOSUrl}/workflows/${workflowId}/runs`,

  // Memory API
  GetMemories: (agentOSUrl: string) => `${agentOSUrl}/memories`,
  CreateMemory: (agentOSUrl: string) => `${agentOSUrl}/memories`,
  UpdateMemory: (agentOSUrl: string, memoryId: string) =>
    `${agentOSUrl}/memories/${memoryId}`,
  DeleteMemory: (agentOSUrl: string, memoryId: string) =>
    `${agentOSUrl}/memories/${memoryId}`,

  // Run Control API (HITL)
  CancelRun: (agentOSUrl: string, agentId: string, runId: string) =>
    `${agentOSUrl}/agents/${agentId}/runs/${runId}/cancel`,
  ContinueRun: (agentOSUrl: string, agentId: string, runId: string) =>
    `${agentOSUrl}/agents/${agentId}/runs/${runId}/continue`,

  // Tracing API
  GetTraces: (agentOSUrl: string) => `${agentOSUrl}/traces`,
  GetTrace: (agentOSUrl: string, traceId: string) =>
    `${agentOSUrl}/traces/${traceId}`,
  GetTracesBySession: (agentOSUrl: string, sessionId: string) =>
    `${agentOSUrl}/sessions/${sessionId}/traces`,
  GetTracesByRun: (agentOSUrl: string, runId: string) =>
    `${agentOSUrl}/runs/${runId}/traces`,

  // Evals API
  GetEvals: (agentOSUrl: string) => `${agentOSUrl}/evals`,
  GetEval: (agentOSUrl: string, evalId: string) =>
    `${agentOSUrl}/evals/${evalId}`,
  RunEval: (agentOSUrl: string, agentId: string) =>
    `${agentOSUrl}/agents/${agentId}/evals`
}
