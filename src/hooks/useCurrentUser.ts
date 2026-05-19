import { useEffect, useRef } from 'react'
import { useAction, useQuery } from 'convex/react'
import { useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'

export function useCurrentUser() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const user = useQuery(api.users.currentUser, isAuthenticated ? {} : 'skip')
  const ensureCachedAvatar = useAction(api.users.ensureCachedAvatar)
  const cachedForUserRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !user) return
    if (!user.image) return
    // Skip if the URL already points at our Convex storage (already cached).
    if (user.image.includes('/storage/')) return
    const key = `${user._id}:${user.image}`
    if (cachedForUserRef.current === key) return
    cachedForUserRef.current = key
    void ensureCachedAvatar({}).catch(() => {})
  }, [ensureCachedAvatar, isAuthenticated, user])

  const isLoading = isAuthLoading || (isAuthenticated && user === undefined)

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated,
  }
}

