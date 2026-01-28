import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { hasRole, type Role } from '@/lib/permissions'

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({
    headers: await headers()
  })

  if (!session) {
    redirect('/login')
  }

  const userRole = (session.user as { role?: string }).role || 'user'

  if (!hasRole(userRole as Role, 'teamAdmin')) {
    redirect('/')
  }

  return <>{children}</>
}
