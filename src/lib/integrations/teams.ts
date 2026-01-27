export interface TeamsMessage {
  '@type': 'MessageCard'
  '@context': string
  summary: string
  themeColor: string
  title: string
  sections: TeamsSection[]
  potentialAction?: TeamsAction[]
}

export interface TeamsSection {
  activityTitle?: string
  activitySubtitle?: string
  facts?: { name: string; value: string }[]
  text?: string
}

export interface TeamsAction {
  '@type': string
  name: string
  targets?: { os: string; uri: string }[]
}

export class TeamsClient {
  private webhookUrl: string

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl
  }

  async sendMessage(message: TeamsMessage): Promise<boolean> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      })

      return response.ok
    } catch (error) {
      console.error('Teams message failed:', error)
      return false
    }
  }

  static formatAgentRunNotification(data: {
    agentName: string
    sessionId: string
    status: 'completed' | 'failed'
    duration?: number
    summary?: string
    error?: string
  }): TeamsMessage {
    const isSuccess = data.status === 'completed'

    return {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      summary: `Agent run ${data.status}: ${data.agentName}`,
      themeColor: isSuccess ? '36a64f' : 'ff0000',
      title: `${data.agentName} - ${data.status.toUpperCase()}`,
      sections: [
        {
          facts: [
            { name: 'Session ID', value: data.sessionId },
            ...(data.duration
              ? [{ name: 'Duration', value: `${data.duration}ms` }]
              : []),
            ...(data.summary ? [{ name: 'Summary', value: data.summary }] : []),
            ...(data.error ? [{ name: 'Error', value: data.error }] : [])
          ]
        }
      ]
    }
  }

  static formatAuditAlert(data: {
    action: string
    actorEmail: string
    resourceType: string
    resourceName: string
    severity: string
  }): TeamsMessage {
    return {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      summary: `Security Alert: ${data.action}`,
      themeColor: 'ff0000',
      title: `🚨 ${data.severity.toUpperCase()} Security Alert`,
      sections: [
        {
          facts: [
            { name: 'Action', value: data.action },
            { name: 'Actor', value: data.actorEmail },
            {
              name: 'Resource',
              value: `${data.resourceType}/${data.resourceName}`
            }
          ]
        }
      ]
    }
  }
}
