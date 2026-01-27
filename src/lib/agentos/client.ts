import { clearToken, getValidToken } from './tokenStore'

export interface AgentOSRequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>
}

export class AgentOSClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: string,
    public response?: unknown
  ) {
    super(message)
    this.name = 'AgentOSClientError'
  }

  /**
   * Check if this is an authentication error (invalid/expired token).
   * Error messages per AgentOS alignment doc.
   */
  isAuthError(): boolean {
    return this.status === 401
  }

  /**
   * Check if this is a permission error (insufficient scopes).
   */
  isPermissionError(): boolean {
    return this.status === 403 && this.detail === 'Insufficient permissions'
  }

  /**
   * Check if the token has expired.
   */
  isTokenExpired(): boolean {
    return this.status === 401 && this.detail === 'Token has expired'
  }
}

/**
 * Make an authenticated request to AgentOS.
 * Automatically handles JWT token management.
 */
export async function agentosRequest<T = unknown>(
  endpoint: string,
  baseUrl: string,
  options: AgentOSRequestOptions = {}
): Promise<T> {
  const token = await getValidToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers
  })

  // Handle 401 - token may be invalid, clear and retry once
  if (response.status === 401 && token) {
    clearToken()
    const newToken = await getValidToken()

    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`
      const retryResponse = await fetch(url, {
        ...options,
        headers
      })

      if (!retryResponse.ok) {
        const errorBody = await retryResponse.json().catch(() => ({}))
        throw new AgentOSClientError(
          `AgentOS request failed: ${retryResponse.statusText}`,
          retryResponse.status,
          errorBody?.detail,
          errorBody
        )
      }

      return retryResponse.json()
    }
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new AgentOSClientError(
      `AgentOS request failed: ${response.statusText}`,
      response.status,
      errorBody?.detail,
      errorBody
    )
  }

  return response.json()
}

/**
 * Create an AgentOS client bound to a specific base URL.
 */
export function createAgentOSClient(baseUrl: string) {
  return {
    get: <T = unknown>(endpoint: string, options?: AgentOSRequestOptions) =>
      agentosRequest<T>(endpoint, baseUrl, { ...options, method: 'GET' }),

    post: <T = unknown>(
      endpoint: string,
      body?: unknown,
      options?: AgentOSRequestOptions
    ) =>
      agentosRequest<T>(endpoint, baseUrl, {
        ...options,
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined
      }),

    patch: <T = unknown>(
      endpoint: string,
      body?: unknown,
      options?: AgentOSRequestOptions
    ) =>
      agentosRequest<T>(endpoint, baseUrl, {
        ...options,
        method: 'PATCH',
        body: body ? JSON.stringify(body) : undefined
      }),

    delete: <T = unknown>(endpoint: string, options?: AgentOSRequestOptions) =>
      agentosRequest<T>(endpoint, baseUrl, { ...options, method: 'DELETE' })
  }
}
