import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'
import { seedAdminIfNeeded } from '@/lib/auth/seedAdmin'
import { seedSSOProviderIfNeeded } from '@/lib/auth/seedSSOProvider'

// Seed admin and SSO providers on first module load (runs once per server instance)
seedAdminIfNeeded().catch(console.error)
seedSSOProviderIfNeeded().catch(console.error)

export const { GET, POST } = toNextJsHandler(auth)
