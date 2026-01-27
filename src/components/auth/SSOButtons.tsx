'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

interface SSOProvider {
  id: string
  name: string
  type: 'oidc' | 'saml'
}

interface SSOButtonsProps {
  callbackURL: string
}

export function SSOButtons({ callbackURL }: SSOButtonsProps) {
  const [providers, setProviders] = useState<SSOProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [signingIn, setSigningIn] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProviders() {
      try {
        const response = await fetch('/api/auth/sso/providers')
        if (response.ok) {
          const data = await response.json()
          setProviders(data)
        }
      } catch (error) {
        console.error('Failed to fetch SSO providers:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchProviders()
  }, [])

  const handleSSOLogin = async (providerId: string) => {
    setSigningIn(providerId)
    try {
      await authClient.signIn.sso({
        providerId,
        callbackURL
      })
    } catch (error) {
      console.error('SSO login failed:', error)
      setSigningIn(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="bg-muted h-10 animate-pulse rounded-md" />
        <div className="bg-muted h-10 animate-pulse rounded-md" />
      </div>
    )
  }

  if (providers.length === 0) {
    return (
      <p className="text-muted-foreground text-center text-sm">
        No SSO providers configured
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {providers.map((provider) => (
        <Button
          key={provider.id}
          variant="outline"
          className="w-full"
          onClick={() => handleSSOLogin(provider.id)}
          disabled={signingIn !== null}
        >
          {signingIn === provider.id ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Signing in...
            </span>
          ) : (
            `Continue with ${provider.name}`
          )}
        </Button>
      ))}
    </div>
  )
}
