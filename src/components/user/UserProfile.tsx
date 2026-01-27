'use client'

import { useUserProfile } from '@/hooks/useUserProfile'
import { useAuth } from '@/components/providers/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Building2,
  Briefcase,
  User,
  Phone,
  MapPin,
  BadgeCheck,
  Clock
} from 'lucide-react'

interface UserProfileProps {
  userId?: string
}

export function UserProfile({ userId }: UserProfileProps) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id

  const { data: profile, isLoading, error } = useUserProfile(targetUserId || '')

  if (!targetUserId) {
    return <div className="text-muted-foreground">Not authenticated</div>
  }

  if (isLoading) {
    return <UserProfileSkeleton />
  }

  if (error || !profile) {
    return <div className="text-destructive">Failed to load profile</div>
  }

  const initials = profile.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile.image || undefined} alt={profile.name} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-xl">{profile.name}</CardTitle>
            <p className="text-muted-foreground">{profile.email}</p>
            {profile.ssoProvider && (
              <Badge variant="secondary" className="mt-2">
                <BadgeCheck className="mr-1 h-3 w-3" />
                SSO: {profile.ssoProvider}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile.jobTitle && (
          <ProfileField
            icon={<Briefcase className="h-4 w-4" />}
            label="Job Title"
            value={profile.jobTitle}
          />
        )}
        {profile.department && (
          <ProfileField
            icon={<Building2 className="h-4 w-4" />}
            label="Department"
            value={profile.department}
          />
        )}
        {profile.manager && (
          <ProfileField
            icon={<User className="h-4 w-4" />}
            label="Manager"
            value={profile.manager}
          />
        )}
        {profile.phone && (
          <ProfileField
            icon={<Phone className="h-4 w-4" />}
            label="Phone"
            value={profile.phone}
          />
        )}
        {profile.location && (
          <ProfileField
            icon={<MapPin className="h-4 w-4" />}
            label="Location"
            value={profile.location}
          />
        )}
        {profile.employeeId && (
          <ProfileField
            icon={<BadgeCheck className="h-4 w-4" />}
            label="Employee ID"
            value={profile.employeeId}
          />
        )}
        {profile.ssoLastSync && (
          <ProfileField
            icon={<Clock className="h-4 w-4" />}
            label="Last SSO Sync"
            value={new Date(profile.ssoLastSync).toLocaleString()}
          />
        )}
      </CardContent>
    </Card>
  )
}

function ProfileField({
  icon,
  label,
  value
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}

function UserProfileSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  )
}
