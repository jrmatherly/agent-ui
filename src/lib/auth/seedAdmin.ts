import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { auth } from '@/lib/auth'
import { eq } from 'drizzle-orm'
import { logAdminEvent } from '@/lib/audit/logger'

let seeded = false

export async function seedAdminIfNeeded() {
  if (seeded) return

  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminEmail || !adminPassword) {
    seeded = true
    return
  }

  const existing = await db.query.user.findFirst({
    where: eq(user.email, adminEmail)
  })

  if (existing) {
    seeded = true
    return
  }

  // Create user via Better Auth
  // databaseHooks.user.create.before sets emailVerified: true for admin
  const result = await auth.api.createUser({
    body: {
      email: adminEmail,
      password: adminPassword,
      name: 'System Administrator',
      role: 'user'
    }
  })

  // Promote to globalAdmin role (emailVerified handled by databaseHook)
  if (result?.user?.id) {
    await db
      .update(user)
      .set({ role: 'globalAdmin' })
      .where(eq(user.id, result.user.id))
  }

  await logAdminEvent(
    'admin.auto_seeded',
    {
      type: 'system',
      id: 'system',
      email: 'system@internal',
      orgId: 'system'
    },
    {
      type: 'user',
      id: result?.user?.id || '',
      name: adminEmail,
      orgId: 'system'
    },
    'success',
    {
      email: adminEmail,
      source: 'environment_variables',
      severity: 'critical'
    }
  )

  seeded = true
  console.log(`[Auth] Fail-safe admin seeded: ${adminEmail}`)
}
