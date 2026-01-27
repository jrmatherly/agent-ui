'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  SSOProvider,
  OIDCProviderConfig,
  SAMLProviderConfig
} from '@/lib/sso/types'

async function fetchProviders(): Promise<SSOProvider[]> {
  const response = await fetch('/api/sso/providers')
  if (!response.ok) throw new Error('Failed to fetch SSO providers')
  return response.json()
}

async function createOIDCProvider(
  config: OIDCProviderConfig
): Promise<SSOProvider> {
  const response = await fetch('/api/sso/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'oidc', ...config })
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create OIDC provider')
  }
  return response.json()
}

async function createSAMLProvider(
  config: SAMLProviderConfig
): Promise<SSOProvider> {
  const response = await fetch('/api/sso/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'saml', ...config })
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create SAML provider')
  }
  return response.json()
}

async function deleteProvider(providerId: string): Promise<void> {
  const response = await fetch(`/api/sso/providers/${providerId}`, {
    method: 'DELETE'
  })
  if (!response.ok) throw new Error('Failed to delete provider')
}

export function useSSOProviders() {
  return useQuery({
    queryKey: ['ssoProviders'],
    queryFn: fetchProviders
  })
}

export function useCreateOIDCProvider() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createOIDCProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ssoProviders'] })
    }
  })
}

export function useCreateSAMLProvider() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createSAMLProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ssoProviders'] })
    }
  })
}

export function useDeleteSSOProvider() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ssoProviders'] })
    }
  })
}
