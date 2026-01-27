'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { SSOButtons } from './SSOButtons'
import { AdminLoginForm } from './AdminLoginForm'

export function LoginPage() {
  const searchParams = useSearchParams()
  const [showAdminLogin, setShowAdminLogin] = useState(false)

  const redirectUrl = searchParams.get('redirect') || '/'

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome to Agent UI
          </h1>
          <p className="text-muted-foreground text-sm">
            Sign in to continue to your dashboard
          </p>
        </div>

        <div className="space-y-4">
          <SSOButtons callbackURL={redirectUrl} />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background text-muted-foreground px-2">
                Or
              </span>
            </div>
          </div>

          {showAdminLogin ? (
            <div className="space-y-4">
              <AdminLoginForm callbackURL={redirectUrl} />
              <button
                type="button"
                onClick={() => setShowAdminLogin(false)}
                className="text-muted-foreground hover:text-foreground w-full text-center text-sm underline-offset-4 hover:underline"
              >
                Back to SSO options
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAdminLogin(true)}
              className="text-muted-foreground hover:text-foreground w-full text-center text-sm underline-offset-4 hover:underline"
            >
              Admin login
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
