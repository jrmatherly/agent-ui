import { APIRoutes } from '@/api/routes'
import type { DocumentUploadMetadata } from './types'

export interface AgentOSKnowledgeConfig {
  endpoint: string
  authToken?: string
}

export interface ContentUploadResponse {
  id: string
  name: string
  status: string
  size: number
}

export interface ContentSearchResult {
  id: string
  content: string
  name: string
  meta_data: Record<string, unknown>
  score: number
}

export class AgentOSKnowledgeClient {
  private endpoint: string
  private authToken?: string

  constructor(config: AgentOSKnowledgeConfig) {
    this.endpoint = config.endpoint
    this.authToken = config.authToken
  }

  private headers(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }
    return headers
  }

  async uploadDocument(
    file: File,
    metadata: DocumentUploadMetadata,
    options?: { name?: string; description?: string }
  ): Promise<ContentUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', options?.name ?? file.name)
    if (options?.description) {
      formData.append('description', options.description)
    }
    // Include scoping metadata for filtering
    formData.append(
      'metadata',
      JSON.stringify({
        kb_id: metadata.kbId,
        org_id: metadata.orgId,
        bu_id: metadata.buId,
        team_id: metadata.teamId,
        user_id: metadata.userId,
        visibility: metadata.visibility
      })
    )

    const response = await fetch(APIRoutes.KnowledgeUpload(this.endpoint), {
      method: 'POST',
      headers: this.authToken
        ? { Authorization: `Bearer ${this.authToken}` }
        : undefined,
      body: formData
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Upload failed: ${error}`)
    }

    return response.json()
  }

  async searchKnowledge(
    query: string,
    filters: Record<string, unknown>,
    options?: {
      maxResults?: number
      searchType?: 'vector' | 'keyword' | 'hybrid'
    }
  ): Promise<ContentSearchResult[]> {
    const response = await fetch(APIRoutes.KnowledgeSearch(this.endpoint), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        query,
        filters,
        max_results: options?.maxResults ?? 10,
        search_type: options?.searchType ?? 'hybrid'
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Search failed: ${error}`)
    }

    const result = await response.json()
    return result.data
  }

  async deleteContent(contentId: string): Promise<void> {
    const response = await fetch(
      APIRoutes.KnowledgeContent(this.endpoint, contentId),
      {
        method: 'DELETE',
        headers: this.headers()
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Delete failed: ${error}`)
    }
  }

  async deleteByFilter(filters: Record<string, unknown>): Promise<number> {
    // List content matching filter, then delete each
    // AgentOS doesn't have bulk delete by filter, so we iterate
    const response = await fetch(
      `${APIRoutes.KnowledgeUpload(this.endpoint)}?${new URLSearchParams({
        filters: JSON.stringify(filters)
      })}`,
      {
        method: 'GET',
        headers: this.headers()
      }
    )

    if (!response.ok) {
      throw new Error('Failed to list content for deletion')
    }

    const { data } = await response.json()
    let deleted = 0

    for (const content of data) {
      await this.deleteContent(content.id)
      deleted++
    }

    return deleted
  }

  async getContentStatus(
    contentId: string
  ): Promise<{ status: string; message?: string }> {
    const response = await fetch(
      APIRoutes.KnowledgeContentStatus(this.endpoint, contentId),
      {
        method: 'GET',
        headers: this.headers()
      }
    )

    if (!response.ok) {
      throw new Error('Failed to get content status')
    }

    return response.json()
  }
}

export function createKnowledgeClient(
  endpoint: string,
  authToken?: string
): AgentOSKnowledgeClient {
  return new AgentOSKnowledgeClient({ endpoint, authToken })
}
