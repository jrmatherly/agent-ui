export interface SlackMessage {
  channel: string
  text: string
  blocks?: SlackBlock[]
  attachments?: SlackAttachment[]
}

export interface SlackBlock {
  type: string
  text?: { type: string; text: string }
  elements?: unknown[]
}

export interface SlackAttachment {
  color?: string
  title?: string
  text?: string
  fields?: { title: string; value: string; short?: boolean }[]
}

export class SlackClient {
  private webhookUrl: string

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl
  }

  async sendMessage(message: SlackMessage): Promise<boolean> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      })

      return response.ok
    } catch (error) {
      console.error('Slack message failed:', error)
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
  }): SlackMessage {
    const isSuccess = data.status === 'completed'

    return {
      channel: '#agent-notifications',
      text: `Agent run ${data.status}: ${data.agentName}`,
      attachments: [
        {
          color: isSuccess ? '#36a64f' : '#ff0000',
          title: `${data.agentName} - ${data.status.toUpperCase()}`,
          fields: [
            { title: 'Session ID', value: data.sessionId, short: true },
            ...(data.duration
              ? [
                  {
                    title: 'Duration',
                    value: `${data.duration}ms`,
                    short: true
                  }
                ]
              : []),
            ...(data.summary
              ? [{ title: 'Summary', value: data.summary }]
              : []),
            ...(data.error ? [{ title: 'Error', value: data.error }] : [])
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
  }): SlackMessage {
    return {
      channel: '#security-alerts',
      text: `Security Alert: ${data.action}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `🚨 ${data.severity.toUpperCase()} Security Alert`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Action:* ${data.action}\n*Actor:* ${data.actorEmail}\n*Resource:* ${data.resourceType}/${data.resourceName}`
          }
        }
      ]
    }
  }
}
