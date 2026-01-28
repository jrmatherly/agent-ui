'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import Icon from '@/components/ui/icon'
import { useAuth } from '@/components/providers/AuthProvider'
import { signOut } from '@/lib/auth-client'
import { Skeleton } from '@/components/ui/skeleton'

const DEFAULT_AVATAR = '/avatar.jpg'

function SidebarUserProfile() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [imageError, setImageError] = useState(false)

  if (isLoading) {
    return (
      <div className="border-border mt-auto border-t pt-3">
        <div className="flex items-center gap-3 p-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex flex-1 flex-col gap-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const initials =
    user.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U'

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <div className="border-border mt-auto border-t pt-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="hover:bg-secondary focus-visible:ring-ring flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors focus:outline-none focus-visible:ring-2"
            type="button"
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage
                src={imageError ? DEFAULT_AVATAR : DEFAULT_AVATAR}
                alt={user.name || 'User'}
                onError={() => setImageError(true)}
              />
              <AvatarFallback className="bg-brand text-xs font-medium text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-foreground truncate text-xs font-medium">
                {user.name || 'User'}
              </span>
              <span className="text-muted-foreground truncate text-xs">
                {user.email}
              </span>
            </div>
            <Icon
              type="chevron-up"
              size="xs"
              className="text-muted-foreground shrink-0"
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bottom-full mb-2 w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-muted-foreground text-xs">{user.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => router.push('/profile')}
            className="gap-2"
          >
            <Icon type="user" size="xs" />
            Profile Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push('/admin')}
            className="gap-2"
          >
            <Icon type="settings" size="xs" />
            Admin Dashboard
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleSignOut}
            className="text-destructive focus:text-destructive gap-2"
          >
            <Icon type="logout" size="xs" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default SidebarUserProfile
