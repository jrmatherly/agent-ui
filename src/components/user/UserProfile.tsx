'use client'

import { useState } from 'react'
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
  Clock,
  ShieldCheck,
  Contact,
  AlertTriangle
} from 'lucide-react'

interface UserProfileProps {
  userId?: string
}

export function UserProfile({ userId }: UserProfileProps) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id

  const { data: profile, isLoading, error } = useUserProfile(targetUserId || '')

  if (!targetUserId) {
    return (
      <Card className="border-amber-500/50 bg-amber-500/10 p-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <p className="text-muted-foreground">Not authenticated</p>
        </div>
      </Card>
    )
  }

  if (isLoading) {
    return <UserProfileSkeleton />
  }

  if (error || !profile) {
    return (
      <Card className="border-destructive/50 bg-destructive/10 p-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="text-destructive h-5 w-5" />
          <p className="text-destructive">Failed to load profile</p>
        </div>
      </Card>
    )
  }

  const initials = profile.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Check if we have work info
  const hasWorkInfo =
    profile.jobTitle ||
    profile.department ||
    profile.manager ||
    profile.employeeId
  // Check if we have contact info
  const hasContactInfo = profile.phone || profile.location

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <Card className="overflow-hidden">
        {/* Cover/banner area */}
        <div className="from-brand/20 h-24 bg-linear-to-r via-purple-500/20 to-blue-500/20" />

        <div className="px-6 pb-6">
          {/* Avatar positioned to overlap banner */}
          <div className="-mt-12 flex items-end gap-4">
            <ProfileAvatar
              src={profile.image}
              name={profile.name}
              initials={initials}
            />
            <div className="mb-2 flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">{profile.name}</h2>
                {profile.ssoProvider && (
                  <Badge variant="secondary" className="gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    SSO Verified
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">{profile.email}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Profile Details - Grouped by section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Work Information */}
        {hasWorkInfo && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="text-muted-foreground h-4 w-4" />
                Work Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.jobTitle && (
                <ProfileField label="Job Title" value={profile.jobTitle} />
              )}
              {profile.department && (
                <ProfileField
                  label="Department"
                  value={profile.department}
                  icon={Building2}
                />
              )}
              {profile.manager && (
                <ProfileField
                  label="Manager"
                  value={profile.manager}
                  icon={User}
                />
              )}
              {profile.employeeId && (
                <ProfileField
                  label="Employee ID"
                  value={profile.employeeId}
                  icon={BadgeCheck}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Contact Information */}
        {hasContactInfo && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Contact className="text-muted-foreground h-4 w-4" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.phone && (
                <ProfileField
                  label="Phone"
                  value={profile.phone}
                  icon={Phone}
                />
              )}
              {profile.location && (
                <ProfileField
                  label="Location"
                  value={profile.location}
                  icon={MapPin}
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* SSO Information (if applicable) */}
      {profile.ssoProvider && (
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-blue-500 dark:text-blue-400">
              <ShieldCheck className="h-4 w-4" />
              Single Sign-On
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">
                  Connected via{' '}
                  <span className="font-medium">{profile.ssoProvider}</span>
                </p>
                {profile.ssoLastSync && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    <Clock className="mr-1 inline h-3 w-3" />
                    Last synced:{' '}
                    {new Date(profile.ssoLastSync).toLocaleString()}
                  </p>
                )}
              </div>
              <Badge
                variant="outline"
                className="border-blue-500/30 text-blue-500 dark:text-blue-400"
              >
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

const DEFAULT_AVATAR = '/avatar.jpg'

function ProfileAvatar({
  src,
  name,
  initials
}: {
  src?: string | null
  name: string
  initials: string
}) {
  const [imageError, setImageError] = useState(false)
  const imageSrc = src && !imageError ? src : DEFAULT_AVATAR

  return (
    <Avatar className="border-background h-24 w-24 border-4 shadow-lg">
      <AvatarImage
        src={imageSrc}
        alt={name}
        onError={() => setImageError(true)}
      />
      <AvatarFallback className="bg-accent text-2xl font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

function ProfileField({
  icon: Icon,
  label,
  value
}: {
  icon?: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      {Icon && (
        <div className="bg-accent/50 mt-0.5 rounded-md p-1.5">
          <Icon className="text-muted-foreground h-4 w-4" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}

function UserProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <Skeleton className="h-24 w-full" />
        <div className="px-6 pb-6">
          <div className="-mt-12 flex items-end gap-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="mb-2 flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </Card>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <Skeleton className="mb-4 h-5 w-40" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
        <Card className="p-6">
          <Skeleton className="mb-4 h-5 w-40" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
      </div>
    </div>
  )
}
