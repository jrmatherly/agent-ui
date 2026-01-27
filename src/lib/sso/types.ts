import { z } from 'zod'

// OIDC attribute mapping - id, email, name are required by Better Auth
export const OIDCAttributeMapping = z.object({
  id: z.string().min(1),
  email: z.string().min(1),
  name: z.string().min(1),
  emailVerified: z.string().optional(),
  image: z.string().optional(),
  extraFields: z
    .object({
      department: z.string().optional(),
      jobTitle: z.string().optional(),
      manager: z.string().optional(),
      phone: z.string().optional(),
      employeeId: z.string().optional(),
      location: z.string().optional()
    })
    .optional()
})

// SAML attribute mapping - id, email, name are required by Better Auth
export const SAMLAttributeMapping = z.object({
  id: z.string().min(1),
  email: z.string().min(1),
  name: z.string().min(1),
  emailVerified: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  extraFields: z
    .object({
      department: z.string().optional(),
      jobTitle: z.string().optional(),
      manager: z.string().optional(),
      phone: z.string().optional(),
      employeeId: z.string().optional(),
      location: z.string().optional()
    })
    .optional()
})

export const OIDCProviderConfigSchema = z.object({
  providerId: z.string().min(1),
  name: z.string().min(1),
  issuer: z.string(),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  discoveryEndpoint: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  pkce: z.boolean().optional(),
  organizationId: z.string().optional(),
  domain: z.string().min(1),
  attributeMapping: OIDCAttributeMapping.optional()
})

export const SAMLProviderConfigSchema = z.object({
  providerId: z.string().min(1),
  name: z.string().min(1),
  entryPoint: z.string(),
  issuer: z.string(),
  cert: z.string().min(1),
  callbackUrl: z.string(),
  organizationId: z.string().optional(),
  domain: z.string().min(1),
  signatureAlgorithm: z.string().optional(),
  wantAssertionsSigned: z.boolean().optional(),
  attributeMapping: SAMLAttributeMapping.optional(),
  spMetadata: z
    .object({
      metadata: z.string().optional(),
      entityID: z.string().optional(),
      binding: z.string().optional(),
      privateKey: z.string().optional(),
      privateKeyPass: z.string().optional(),
      isAssertionEncrypted: z.boolean().optional(),
      encPrivateKey: z.string().optional(),
      encPrivateKeyPass: z.string().optional()
    })
    .optional()
})

export type OIDCProviderConfig = z.infer<typeof OIDCProviderConfigSchema>
export type SAMLProviderConfig = z.infer<typeof SAMLProviderConfigSchema>
export type OIDCAttributeMappingType = z.infer<typeof OIDCAttributeMapping>
export type SAMLAttributeMappingType = z.infer<typeof SAMLAttributeMapping>

export interface SSOProvider {
  id: string
  type: 'oidc' | 'saml'
  name: string
  providerId: string
  organizationId?: string
  domain: string
  enabled: boolean
  config: OIDCProviderConfig | SAMLProviderConfig
  createdAt: Date
  updatedAt: Date
}

export interface GroupRoleMapping {
  groupPattern: string
  role: 'member' | 'admin'
}
