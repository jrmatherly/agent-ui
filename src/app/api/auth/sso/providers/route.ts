import { NextResponse } from 'next/server'
import { ssoProviderService } from '@/lib/sso/providerService'

// Public endpoint - no authentication required
// Returns list of enabled SSO providers for the login page
export async function GET() {
  const providers = await ssoProviderService.getEnabledProviders()
  return NextResponse.json(providers)
}
