import { UserProfile } from '@/components/user/UserProfile'

export default function ProfilePage() {
  return (
    <div className="container mx-auto max-w-2xl py-6">
      <h1 className="mb-6 text-2xl font-bold">My Profile</h1>
      <UserProfile />
    </div>
  )
}
