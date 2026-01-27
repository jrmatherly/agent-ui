/**
 * In-memory token store for AgentOS JWT.
 *
 * Tokens are stored in memory only (not localStorage/sessionStorage)
 * for security. This means tokens are cleared on page refresh,
 * but auto-refresh handles seamless re-authentication.
 */

interface TokenState {
  token: string | null
  expiresAt: number | null
  isFetching: boolean
  fetchPromise: Promise<string | null> | null
}

const state: TokenState = {
  token: null,
  expiresAt: null,
  isFetching: false,
  fetchPromise: null
}

// Refresh token when less than 5 minutes remaining
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000

async function fetchToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/agentos/token', {
      method: 'POST',
      credentials: 'include'
    })

    if (!response.ok) {
      if (response.status === 401) {
        // User not authenticated - this is expected for logged-out users
        return null
      }
      throw new Error(`Token fetch failed: ${response.status}`)
    }

    const data = await response.json()
    state.token = data.token
    state.expiresAt = data.expiresAt
    return data.token
  } catch (error) {
    console.error('Failed to fetch AgentOS token:', error)
    return null
  }
}

/**
 * Get a valid AgentOS token, fetching or refreshing as needed.
 * Returns null if user is not authenticated.
 */
export async function getValidToken(): Promise<string | null> {
  const now = Date.now()

  // If we have a valid token with enough time remaining, return it
  if (
    state.token &&
    state.expiresAt &&
    state.expiresAt - now > REFRESH_THRESHOLD_MS
  ) {
    return state.token
  }

  // If already fetching, wait for that request
  if (state.isFetching && state.fetchPromise) {
    return state.fetchPromise
  }

  // Fetch a new token
  state.isFetching = true
  state.fetchPromise = fetchToken().finally(() => {
    state.isFetching = false
    state.fetchPromise = null
  })

  return state.fetchPromise
}

/**
 * Clear the cached token (call on logout).
 */
export function clearToken(): void {
  state.token = null
  state.expiresAt = null
}

/**
 * Check if a token is currently cached.
 */
export function hasToken(): boolean {
  return state.token !== null
}
