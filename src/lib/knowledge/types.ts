import { z } from 'zod'

export const ScopeType = z.enum([
  'organization',
  'business_unit',
  'team',
  'personal'
])
export type ScopeType = z.infer<typeof ScopeType>

export const KnowledgeBaseVisibility = z.enum([
  'private',
  'inherited',
  'team',
  'organization'
])
export type KnowledgeBaseVisibility = z.infer<typeof KnowledgeBaseVisibility>

export const CreateKnowledgeBaseSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  scopeType: ScopeType,
  teamId: z.string().uuid().optional(),
  visibility: KnowledgeBaseVisibility.optional(),
  config: z.record(z.string(), z.unknown()).optional()
})

export const UpdateKnowledgeBaseSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  visibility: KnowledgeBaseVisibility.optional(),
  config: z.record(z.string(), z.unknown()).optional()
})

export type CreateKnowledgeBase = z.infer<typeof CreateKnowledgeBaseSchema>
export type UpdateKnowledgeBase = z.infer<typeof UpdateKnowledgeBaseSchema>

export interface KnowledgeBaseWithStats {
  id: string
  name: string
  description: string | null
  scopeType: ScopeType
  orgId: string
  buId: string | null
  teamId: string | null
  userId: string | null
  visibility: string
  config: Record<string, unknown> | null
  documentCount: number
  totalSizeBytes: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface DocumentUploadMetadata {
  kbId: string
  orgId: string
  buId?: string
  teamId?: string
  userId: string
  visibility: string
}
