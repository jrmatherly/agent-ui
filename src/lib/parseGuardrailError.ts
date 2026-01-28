/**
 * Parses guardrail errors from Agno's pre-hook validation.
 *
 * Agno guardrails are pre-execution hooks that throw InputCheckError
 * BEFORE the agent runs. They return HTTP 4xx errors (not SSE events).
 */

export interface GuardrailError {
  trigger: string
  message: string
  details?: Record<string, unknown>
}

/**
 * Attempt to parse a guardrail error from an error response.
 * Returns null if the error is not a guardrail violation.
 */
export function parseGuardrailError(
  error: Error | Response | unknown
): GuardrailError | null {
  // Handle Error objects with message
  if (error instanceof Error) {
    return parseErrorMessage(error.message)
  }

  // Handle raw error strings
  if (typeof error === 'string') {
    return parseErrorMessage(error)
  }

  // Handle error objects with message property
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return parseErrorMessage((error as { message: string }).message)
  }

  return null
}

function parseErrorMessage(message: string): GuardrailError | null {
  // Check for InputCheckError pattern from Agno
  if (
    message.includes('InputCheckError') ||
    message.includes('input_check_error')
  ) {
    return extractGuardrailDetails(message, 'Input Validation')
  }

  // Check for PII detection
  if (
    message.toLowerCase().includes('pii') ||
    message.includes('personal information') ||
    message.includes('PIIDetection')
  ) {
    return extractGuardrailDetails(message, 'PII Detection')
  }

  // Check for injection attacks
  if (
    message.toLowerCase().includes('injection') ||
    message.includes('prompt injection') ||
    message.includes('InjectionDetection')
  ) {
    return extractGuardrailDetails(message, 'Injection Detection')
  }

  // Check for content moderation
  if (
    message.toLowerCase().includes('moderation') ||
    message.includes('content policy') ||
    message.includes('ContentModeration')
  ) {
    return extractGuardrailDetails(message, 'Content Moderation')
  }

  // Check for rate limiting
  if (
    message.toLowerCase().includes('rate limit') ||
    message.includes('RateLimit')
  ) {
    return extractGuardrailDetails(message, 'Rate Limit')
  }

  // Generic guardrail detection
  if (
    message.toLowerCase().includes('guardrail') ||
    message.includes('pre_hook') ||
    message.includes('check_trigger')
  ) {
    return extractGuardrailDetails(message, 'Security Check')
  }

  return null
}

function extractGuardrailDetails(
  message: string,
  defaultTrigger: string
): GuardrailError {
  // Try to extract a more specific message from JSON if present
  let cleanMessage = message
  let trigger = defaultTrigger

  // Try to parse JSON error details
  const jsonMatch = message.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.check_trigger) {
        trigger = formatTriggerName(parsed.check_trigger)
      }
      if (parsed.message) {
        cleanMessage = parsed.message
      }
      if (parsed.detail) {
        cleanMessage = parsed.detail
      }
    } catch {
      // JSON parsing failed, use original message
    }
  }

  // Clean up the message for display
  cleanMessage = cleanMessage
    .replace(/InputCheckError:?\s*/i, '')
    .replace(/Error:?\s*/i, '')
    .trim()

  // If message is too long or contains technical details, simplify it
  if (cleanMessage.length > 200 || cleanMessage.includes('Traceback')) {
    cleanMessage = getSimplifiedMessage(trigger)
  }

  return {
    trigger,
    message: cleanMessage || getSimplifiedMessage(trigger)
  }
}

function formatTriggerName(trigger: string): string {
  // Convert snake_case or camelCase to Title Case
  return trigger
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^\s+/, '')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim()
}

function getSimplifiedMessage(trigger: string): string {
  const messages: Record<string, string> = {
    'PII Detection':
      'Your message contains personal information that cannot be processed.',
    'Injection Detection':
      'Your message was blocked due to a potential security concern.',
    'Content Moderation':
      'Your message was blocked due to content policy violations.',
    'Rate Limit': 'Too many requests. Please wait before trying again.',
    'Input Validation': 'Your input could not be validated.',
    'Security Check': 'Your message was blocked by a security check.'
  }

  return messages[trigger] || 'Your request was blocked by a guardrail.'
}
