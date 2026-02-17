import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export function useCurrentUser() {
  const user = useQuery(api.users.currentUser)

  const isLoading = user === undefined
  const isAuthenticated = !!user

  return {
    user,
    isLoading,
    isAuthenticated,
  }
}

